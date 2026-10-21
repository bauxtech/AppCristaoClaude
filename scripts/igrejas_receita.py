"""Lista de igrejas tirada dos dados abertos do CNPJ da Receita Federal (21/10).

Baixa, um por vez, os arquivos do mês, guarda só os estabelecimentos ativos de organizações religiosas
(CNAE 9491-0/00) e apaga o arquivo baixado. Não guarda telefone, e-mail nem sócios.
Saída: CSV (cnpj, nome, razao_social, logradouro, numero, bairro, cep, uf, cidade), em UTF-8.

Uso: python3 -I scripts/igrejas_receita.py 2026-10 pasta_de_trabalho saida.csv.gz
"""
import csv
import gzip
import io
import os
import subprocess
import sys
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

SHARE = 'YggdBLfdninEJX9'
BASE = 'https://arquivos.receitafederal.gov.br/public.php/webdav'
CNAE_RELIGIOSA = '9491000'
ATIVA = '02'


def baixar(mes, nome, pasta):
    destino = os.path.join(pasta, nome)
    for tentativa in range(5):
        r = subprocess.run(['curl', '-sS', '-f', '-L', '--retry', '5', '-C', '-', '-u', f'{SHARE}:', '-o', destino, f'{BASE}/{mes}/{nome}'])
        if r.returncode == 0:
            return destino
    raise SystemExit(f'Não deu para baixar {nome}')


def linhas(caminho):
    with zipfile.ZipFile(caminho) as z:
        for membro in z.namelist():
            with z.open(membro) as f:
                yield from csv.reader(io.TextIOWrapper(f, encoding='latin-1', newline=''), delimiter=';', quotechar='"')


def main(mes, pasta, saida):
    os.makedirs(pasta, exist_ok=True)
    cidades = {}
    caminho = baixar(mes, 'Municipios.zip', pasta)
    for row in linhas(caminho):
        cidades[row[0]] = row[1].strip().title()
    os.remove(caminho)

    igrejas = {}
    # O servidor da Receita é lento por conexão: baixa quatro arquivos por vez e lê cada um assim que chega.
    pool = ThreadPoolExecutor(4)
    for fut in as_completed([pool.submit(baixar, mes, f'Estabelecimentos{i}.zip', pasta) for i in range(10)]):
        caminho = fut.result()
        for row in linhas(caminho):
            if len(row) < 21 or row[11] != CNAE_RELIGIOSA or row[5] != ATIVA:
                continue
            cnpj = row[0] + row[1] + row[2]
            igrejas[cnpj] = [cnpj, row[4].strip(), '', ' '.join(x for x in (row[13].strip(), row[14].strip()) if x), row[15].strip(), row[17].strip(), row[18].strip(), row[19].strip(), cidades.get(row[20], '')]
        os.remove(caminho)
        print(f'{os.path.basename(caminho)}: {len(igrejas)} igrejas até aqui', flush=True)

    bases = {c[:8] for c in igrejas}
    razao = {}
    for fut in as_completed([pool.submit(baixar, mes, f'Empresas{i}.zip', pasta) for i in range(10)]):
        caminho = fut.result()
        for row in linhas(caminho):
            if row and row[0] in bases:
                razao[row[0]] = row[1].strip()
        os.remove(caminho)
        print(f'{os.path.basename(caminho)}: {len(razao)} razões sociais', flush=True)

    with gzip.open(saida, 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['cnpj', 'nome', 'razao_social', 'logradouro', 'numero', 'bairro', 'cep', 'uf', 'cidade'])
        for cnpj, r in igrejas.items():
            r[2] = razao.get(cnpj[:8], '')
            if not r[1]:
                r[1] = r[2]
            if r[1]:
                w.writerow(r)
    print(f'Pronto: {len(igrejas)} igrejas em {saida}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
