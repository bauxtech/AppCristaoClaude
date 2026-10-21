-- Busca da igreja pelo nome e pela cidade, com a lista da Receita (21/10). Roda depois de 40_offers.sql.

insert into public.church_directory (cnpj, name, legal_name, address, neighborhood, city) values
  ('11111111000111', 'Primeira Igreja Batista do Brasil', 'Primeira Igreja Batista do Brasil', 'Rua Exemplo, 10, Garcia, Salvador, BA', 'Garcia', 'Salvador, BA'),
  ('22222222000122', 'Igreja Batista Central', 'Igreja Batista Central de São Paulo', 'Av. Exemplo, 20, Pinheiros, São Paulo, SP', 'Pinheiros', 'São Paulo, SP'),
  ('33333333000133', 'Assembleia de Deus Ministério Exemplo', 'Igreja Evangélica Assembleia de Deus', 'Rua Teste, 30, Centro, Salvador, BA', 'Centro', 'Salvador, BA');

select tests.as_user('00000000-0000-0000-0000-000000000041');
select tests.ok('ninguém lê a lista da Receita direto', tests.denied($$select * from public.church_directory$$));
select tests.ok('busca pela sigla e pela cidade, sem acento', (select count(*) from public.search_churches('pib salvador')) = 1
  and (select name from public.search_churches('pib salvador')) = 'Primeira Igreja Batista do Brasil');
select tests.ok('busca com acento e em outra ordem', (select count(*) from public.search_churches('são paulo batista')) = 1);
select tests.ok('todas as palavras precisam aparecer', (select count(*) from public.search_churches('batista recife')) = 0);
select tests.ok('busca pelo CNPJ com pontuação', (select count(*) from public.search_churches('33.333.333/0001-33')) = 1);
select tests.ok('texto sem palavra útil não traz nada', (select count(*) from public.search_churches('de a')) = 0);
select tests.ok('aspas e símbolos viram só palavras: não mudam o sentido da busca',
  (select count(*) from public.search_churches($q$batista'; delete from churches; --$q$)) = 0
  and (select count(*) from public.search_churches($q$'central'%$q$)) = 1);
select public.church_from_directory('11111111000111');
select tests.ok('a igreja escolhida entra no app, sem dono', (select created_by is null and name = 'Primeira Igreja Batista do Brasil' from public.churches where cnpj = '11111111000111'));
select tests.ok('escolher de novo não duplica', (select public.church_from_directory('11111111000111')) = (select id from public.churches where cnpj = '11111111000111')
  and (select count(*) from public.churches where cnpj = '11111111000111') = 1);
select tests.ok('depois de entrar no app, aparece uma vez só e com o id', (select count(*) from public.search_churches('pib salvador')) = 1
  and (select id from public.search_churches('pib salvador')) is not null);
select tests.ok('CNPJ que não está na lista é recusado', tests.denied($$select public.church_from_directory('99999999000199')$$));
reset role;
select tests.as_anon();
select tests.ok('sem login, ninguém busca', tests.denied($$select * from public.search_churches('batista')$$));
select tests.ok('sem login, ninguém cria igreja pela lista', tests.denied($$select public.church_from_directory('22222222000122')$$));
reset role;
