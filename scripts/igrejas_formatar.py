"""Passa a lista de igrejas da Receita (saída de igrejas_receita.py, em maiúsculas) para o formato do banco.

Mesma escrita da busca pelo CNPJ (supabase/functions/_shared/church.ts): nome e endereço com iniciais maiúsculas,
"de", "da", "do" e "e" em minúsculas, cidade como "Salvador, BA".
Saída: CSV com cnpj, name, legal_name, address, neighborhood, city (colunas de church_directory).

Uso: python3 -I scripts/igrejas_formatar.py igrejas.csv.gz church_directory.csv.gz
"""
import csv
import gzip
import re
import sys

MINUSCULAS = re.compile(r'\b(De|Da|Do|Das|Dos|E)\b')


def titulo(s):
    s = (s or '').strip().lower()
    s = re.sub(r'(^|\s|-|/)(\w)', lambda m: m.group(1) + m.group(2).upper(), s)
    return MINUSCULAS.sub(lambda m: m.group(1).lower(), s).strip()


def linha(r):
    cnpj, nome, razao, logradouro, numero, bairro, _cep, uf, cidade = r
    lugar = ', '.join(x for x in (titulo(logradouro), numero.strip() if numero.strip() not in ('', 'S/N', 'SN') else '') if x)
    cidade_uf = ', '.join(x for x in (titulo(cidade), uf.strip().upper()) if x)
    endereco = ', '.join(x for x in (lugar, titulo(bairro), cidade_uf) if x)
    nome_final = titulo(nome or razao)[:120] or 'Igreja'
    return [cnpj, nome_final, titulo(razao)[:160], endereco[:200], titulo(bairro)[:80], cidade_uf[:80]]


def main(entrada, saida):
    n = 0
    with gzip.open(entrada, 'rt', encoding='utf-8', newline='') as f, gzip.open(saida, 'wt', encoding='utf-8', newline='') as g:
        r = csv.reader(f)
        next(r)
        w = csv.writer(g)
        w.writerow(['cnpj', 'name', 'legal_name', 'address', 'neighborhood', 'city'])
        for row in r:
            w.writerow(linha(row))
            n += 1
    print(f'{n} igrejas em {saida}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
