// Livros da Bíblia com os dados de exemplo do protótipo (capítulos lidos, autor, época, tema).
// O texto bíblico completo, de domínio público, entra quando a Bíblia for carregada no app.

export interface BookInfo {
  name: string
  abbr: string
  chapters: number
  read: number
  testament: 'AT' | 'NT'
  author?: string
  era?: string
  theme?: string
  genre?: string
}

export const BOOKS: BookInfo[] = [
  // AT
  { name: 'Gênesis', abbr: 'Gn', chapters: 50, read: 50, testament: 'AT', author: 'Moisés', era: '1400 a.C. aprox.', theme: 'Origem do universo, humanidade e povo de Israel. Deus cria, o homem cai, Deus redime através de Abraão e seus descendentes. A promessa de salvação começa aqui.', genre: 'Lei / Narrativa' },
  { name: 'Êxodo', abbr: 'Ex', chapters: 40, read: 40, testament: 'AT', author: 'Moisés', era: '1400 a.C. aprox.', theme: 'Libertação de Israel do Egito e a aliança no Sinai. Deus revela seu caráter através de milagres e da Lei.', genre: 'Lei / Narrativa' },
  { name: 'Levítico', abbr: 'Lv', chapters: 27, read: 15, testament: 'AT', author: 'Moisés', era: '1400 a.C. aprox.', theme: 'Leis de santidade e adoração para o povo de Deus. Ensina como se aproximar do Deus santo.', genre: 'Lei' },
  { name: 'Números', abbr: 'Nm', chapters: 36, read: 0, testament: 'AT', author: 'Moisés', era: '1400 a.C. aprox.', theme: 'Jornada de Israel pelo deserto. Fé, rebeldia e fidelidade de Deus.', genre: 'Lei / Narrativa' },
  { name: 'Deuteronômio', abbr: 'Dt', chapters: 34, read: 0, testament: 'AT', author: 'Moisés', era: '1400 a.C. aprox.', theme: 'Renovação da aliança antes de entrar em Canaã. Moisés discursa ao povo.', genre: 'Lei' },
  { name: 'Josué', abbr: 'Js', chapters: 24, read: 0, testament: 'AT', author: 'Josué', era: '1400–1350 a.C.', theme: 'Conquista e divisão da Terra Prometida. Fidelidade de Deus às suas promessas.', genre: 'Histórico' },
  { name: 'Juízes', abbr: 'Jz', chapters: 21, read: 0, testament: 'AT', author: 'Desconhecido', era: '1350–1050 a.C.', theme: 'Ciclos de pecado, opressão, arrependimento e libertação em Israel.', genre: 'Histórico' },
  { name: 'Rute', abbr: 'Rt', chapters: 4, read: 4, testament: 'AT', author: 'Desconhecido', era: '1100 a.C. aprox.', theme: 'Fidelidade, redenção e amor. Rute e Boaz como ancestrais de Davi.', genre: 'Histórico / Narrativa' },
  { name: '1 Samuel', abbr: '1Sm', chapters: 31, read: 0, testament: 'AT', author: 'Desconhecido', era: '1000 a.C. aprox.', theme: 'Transição de Israel para a monarquia. Samuel, Saul e Davi.', genre: 'Histórico' },
  { name: '2 Samuel', abbr: '2Sm', chapters: 24, read: 0, testament: 'AT', author: 'Desconhecido', era: '1000 a.C. aprox.', theme: 'Reino de Davi — glória, pecado e consequências.', genre: 'Histórico' },
  { name: '1 Reis', abbr: '1Rs', chapters: 22, read: 0, testament: 'AT', author: 'Desconhecido', era: '950–850 a.C.', theme: 'Salomão e a divisão do reino. Elias e a apostasia de Israel.', genre: 'Histórico' },
  { name: '2 Reis', abbr: '2Rs', chapters: 25, read: 0, testament: 'AT', author: 'Desconhecido', era: '850–550 a.C.', theme: 'Declínio e exílio de Israel e Judá.', genre: 'Histórico' },
  { name: '1 Crônicas', abbr: '1Cr', chapters: 29, read: 0, testament: 'AT', author: 'Esdras', era: '450 a.C. aprox.', theme: 'Genealogias e o reino de Davi sob perspectiva espiritual.', genre: 'Histórico' },
  { name: '2 Crônicas', abbr: '2Cr', chapters: 36, read: 0, testament: 'AT', author: 'Esdras', era: '450 a.C. aprox.', theme: 'Do templo de Salomão ao exílio babilônico.', genre: 'Histórico' },
  { name: 'Esdras', abbr: 'Ed', chapters: 10, read: 0, testament: 'AT', author: 'Esdras', era: '450 a.C. aprox.', theme: 'Retorno do exílio e restauração do templo e da comunidade.', genre: 'Histórico' },
  { name: 'Neemias', abbr: 'Ne', chapters: 13, read: 0, testament: 'AT', author: 'Neemias', era: '445 a.C. aprox.', theme: 'Reconstrução dos muros de Jerusalém e renovação espiritual.', genre: 'Histórico' },
  { name: 'Ester', abbr: 'Et', chapters: 10, read: 10, testament: 'AT', author: 'Desconhecido', era: '480 a.C. aprox.', theme: 'Providência de Deus na preservação do povo judeu através de Ester.', genre: 'Histórico / Narrativa' },
  { name: 'Jó', abbr: 'Jó', chapters: 42, read: 0, testament: 'AT', author: 'Desconhecido', era: 'Patriarcal', theme: 'Sofrimento, fidelidade e a soberania de Deus diante do mal.', genre: 'Poesia / Sabedoria' },
  { name: 'Salmos', abbr: 'Sl', chapters: 150, read: 23, testament: 'AT', author: 'Davi (principal)', era: '1000 a.C. aprox.', theme: 'Coletânea de hinos, lamentos e louvor a Deus. Expressa toda a gama de emoções humanas diante do Senhor. Cada salmo é uma oração ou declaração de fé.', genre: 'Poesia / Hinário' },
  { name: 'Provérbios', abbr: 'Pv', chapters: 31, read: 0, testament: 'AT', author: 'Salomão', era: '950 a.C. aprox.', theme: 'Sabedoria prática para a vida cotidiana segundo os princípios de Deus.', genre: 'Sabedoria' },
  { name: 'Eclesiastes', abbr: 'Ec', chapters: 12, read: 0, testament: 'AT', author: 'Salomão', era: '940 a.C. aprox.', theme: 'Busca de sentido na vida. Tudo é vaidade sem Deus.', genre: 'Sabedoria' },
  { name: 'Cânticos', abbr: 'Ct', chapters: 8, read: 0, testament: 'AT', author: 'Salomão', era: '950 a.C. aprox.', theme: 'Amor entre o homem e a mulher como reflexo do amor de Deus.', genre: 'Poesia' },
  { name: 'Isaías', abbr: 'Is', chapters: 66, read: 0, testament: 'AT', author: 'Isaías', era: '740–700 a.C.', theme: 'Julgamento e redenção. O Servo Sofredor e a esperança messiânica.', genre: 'Profético' },
  { name: 'Jeremias', abbr: 'Jr', chapters: 52, read: 0, testament: 'AT', author: 'Jeremias', era: '620–580 a.C.', theme: 'Chamado ao arrependimento antes do exílio. A nova aliança prometida.', genre: 'Profético' },
  { name: 'Lamentações', abbr: 'Lm', chapters: 5, read: 0, testament: 'AT', author: 'Jeremias', era: '586 a.C.', theme: 'Lamento pela destruição de Jerusalém. Esperança em meio à dor.', genre: 'Poesia / Lamento' },
  { name: 'Ezequiel', abbr: 'Ez', chapters: 48, read: 0, testament: 'AT', author: 'Ezequiel', era: '590–570 a.C.', theme: 'Visões proféticas do juízo e da restauração de Israel.', genre: 'Profético' },
  { name: 'Daniel', abbr: 'Dn', chapters: 12, read: 12, testament: 'AT', author: 'Daniel', era: '600–530 a.C.', theme: 'Fidelidade a Deus em terra estrangeira. Visões apocalípticas do futuro.', genre: 'Profético / Apocalíptico' },
  { name: 'Oseias', abbr: 'Os', chapters: 14, read: 0, testament: 'AT', author: 'Oseias', era: '755–715 a.C.', theme: 'Amor de Deus por Israel mesmo em sua infidelidade.', genre: 'Profético' },
  { name: 'Joel', abbr: 'Jl', chapters: 3, read: 0, testament: 'AT', author: 'Joel', era: '835 a.C. aprox.', theme: 'O Dia do Senhor e a promessa do derramamento do Espírito.', genre: 'Profético' },
  { name: 'Amós', abbr: 'Am', chapters: 9, read: 0, testament: 'AT', author: 'Amós', era: '760 a.C. aprox.', theme: 'Justiça social e julgamento contra Israel e as nações.', genre: 'Profético' },
  { name: 'Obadias', abbr: 'Ob', chapters: 1, read: 0, testament: 'AT', author: 'Obadias', era: '586 a.C. aprox.', theme: 'Julgamento de Edom e restauração de Israel.', genre: 'Profético' },
  { name: 'Jonas', abbr: 'Jn', chapters: 4, read: 4, testament: 'AT', author: 'Jonas', era: '760 a.C. aprox.', theme: 'Misericórdia de Deus para além de Israel. Fuga e obediência.', genre: 'Profético / Narrativa' },
  { name: 'Miquéias', abbr: 'Mq', chapters: 7, read: 0, testament: 'AT', author: 'Miquéias', era: '740–700 a.C.', theme: 'Julgamento e esperança. O Governante de Belém.', genre: 'Profético' },
  { name: 'Naum', abbr: 'Na', chapters: 3, read: 0, testament: 'AT', author: 'Naum', era: '650 a.C. aprox.', theme: 'Julgamento de Nínive e conforto para Judá.', genre: 'Profético' },
  { name: 'Habacuque', abbr: 'Hb', chapters: 3, read: 0, testament: 'AT', author: 'Habacuque', era: '610 a.C. aprox.', theme: 'O justo viverá pela fé. Diálogo com Deus sobre o mal.', genre: 'Profético' },
  { name: 'Sofonias', abbr: 'Sf', chapters: 3, read: 0, testament: 'AT', author: 'Sofonias', era: '630 a.C. aprox.', theme: 'O Dia do Senhor como juízo e salvação.', genre: 'Profético' },
  { name: 'Ageu', abbr: 'Ag', chapters: 2, read: 0, testament: 'AT', author: 'Ageu', era: '520 a.C.', theme: 'Encorajamento para reconstruir o templo após o exílio.', genre: 'Profético' },
  { name: 'Zacarias', abbr: 'Zc', chapters: 14, read: 0, testament: 'AT', author: 'Zacarias', era: '520–480 a.C.', theme: 'Visões sobre a restauração e o Rei que vem em mansidão.', genre: 'Profético' },
  { name: 'Malaquias', abbr: 'Ml', chapters: 4, read: 0, testament: 'AT', author: 'Malaquias', era: '430 a.C. aprox.', theme: 'Chamado ao arrependimento e anúncio do mensageiro que prepara o caminho.', genre: 'Profético' },
  // NT
  { name: 'Mateus', abbr: 'Mt', chapters: 28, read: 28, testament: 'NT', author: 'Mateus', era: '60–70 d.C.', theme: 'Jesus como o Rei prometido. O evangelho do Reino dos Céus dirigido aos judeus.', genre: 'Evangelho' },
  { name: 'Marcos', abbr: 'Mc', chapters: 16, read: 16, testament: 'NT', author: 'Marcos', era: '55–65 d.C.', theme: 'Jesus como Servo que age com poder e urgência. O evangelho mais curto e dinâmico.', genre: 'Evangelho' },
  { name: 'Lucas', abbr: 'Lc', chapters: 24, read: 24, testament: 'NT', author: 'Lucas', era: '60–70 d.C.', theme: 'Jesus como Salvador de todos. Atenção especial aos pobres, mulheres e excluídos.', genre: 'Evangelho' },
  { name: 'João', abbr: 'Jo', chapters: 21, read: 14, testament: 'NT', author: 'João', era: '85–95 d.C.', theme: 'Jesus como o Filho de Deus. "Para que creiais que Jesus é o Cristo."', genre: 'Evangelho' },
  { name: 'Atos', abbr: 'At', chapters: 28, read: 0, testament: 'NT', author: 'Lucas', era: '62–70 d.C.', theme: 'Nascimento e expansão da igreja pelo poder do Espírito Santo.', genre: 'Histórico' },
  { name: 'Romanos', abbr: 'Rm', chapters: 16, read: 0, testament: 'NT', author: 'Paulo', era: '57 d.C.', theme: 'O evangelho da graça. Justificação pela fé e vida no Espírito.', genre: 'Carta' },
  { name: '1 Coríntios', abbr: '1Co', chapters: 16, read: 0, testament: 'NT', author: 'Paulo', era: '55 d.C.', theme: 'Problemas práticos da igreja. Unidade, dons espirituais e ressurreição.', genre: 'Carta' },
  { name: '2 Coríntios', abbr: '2Co', chapters: 13, read: 0, testament: 'NT', author: 'Paulo', era: '56 d.C.', theme: 'Defesa do apostolado de Paulo. Força na fraqueza.', genre: 'Carta' },
  { name: 'Gálatas', abbr: 'Gl', chapters: 6, read: 6, testament: 'NT', author: 'Paulo', era: '49 d.C.', theme: 'Liberdade em Cristo. A salvação é pela fé, não pelas obras da lei.', genre: 'Carta' },
  { name: 'Efésios', abbr: 'Ef', chapters: 6, read: 6, testament: 'NT', author: 'Paulo', era: '60–62 d.C.', theme: 'A igreja como corpo de Cristo. Riquezas espirituais e vida prática.', genre: 'Carta' },
  { name: 'Filipenses', abbr: 'Fp', chapters: 4, read: 4, testament: 'NT', author: 'Paulo', era: '61 d.C.', theme: 'Alegria em Cristo mesmo na prisão. A mente de Cristo como modelo.', genre: 'Carta' },
  { name: 'Colossenses', abbr: 'Cl', chapters: 4, read: 0, testament: 'NT', author: 'Paulo', era: '60–62 d.C.', theme: 'A supremacia de Cristo sobre todas as coisas.', genre: 'Carta' },
  { name: '1 Tessalonicenses', abbr: '1Ts', chapters: 5, read: 0, testament: 'NT', author: 'Paulo', era: '51 d.C.', theme: 'Vida cristã e esperança na volta de Cristo.', genre: 'Carta' },
  { name: '2 Tessalonicenses', abbr: '2Ts', chapters: 3, read: 0, testament: 'NT', author: 'Paulo', era: '51–52 d.C.', theme: 'Esclarecimentos sobre o Dia do Senhor. Perseverança.', genre: 'Carta' },
  { name: '1 Timóteo', abbr: '1Tm', chapters: 6, read: 0, testament: 'NT', author: 'Paulo', era: '62–65 d.C.', theme: 'Instruções para liderança e ordem na igreja.', genre: 'Carta Pastoral' },
  { name: '2 Timóteo', abbr: '2Tm', chapters: 4, read: 0, testament: 'NT', author: 'Paulo', era: '66–67 d.C.', theme: 'Último testamento de Paulo. Fidelidade até o fim.', genre: 'Carta Pastoral' },
  { name: 'Tito', abbr: 'Tt', chapters: 3, read: 0, testament: 'NT', author: 'Paulo', era: '63–65 d.C.', theme: 'Ordem na igreja e vida cristã saudável.', genre: 'Carta Pastoral' },
  { name: 'Filemom', abbr: 'Fm', chapters: 1, read: 1, testament: 'NT', author: 'Paulo', era: '60–62 d.C.', theme: 'Reconciliação e perdão cristão. Onésimo e Filemom.', genre: 'Carta' },
  { name: 'Hebreus', abbr: 'Hb', chapters: 13, read: 0, testament: 'NT', author: 'Desconhecido', era: '65–70 d.C.', theme: 'Superioridade de Cristo sobre a lei e o sacerdócio levítico.', genre: 'Carta / Sermão' },
  { name: 'Tiago', abbr: 'Tg', chapters: 5, read: 5, testament: 'NT', author: 'Tiago', era: '45–49 d.C.', theme: 'Fé que se expressa em obras. Sabedoria prática para a vida cristã.', genre: 'Carta' },
  { name: '1 Pedro', abbr: '1Pe', chapters: 5, read: 5, testament: 'NT', author: 'Pedro', era: '60–65 d.C.', theme: 'Esperança no sofrimento. Vida santa em meio à perseguição.', genre: 'Carta' },
  { name: '2 Pedro', abbr: '2Pe', chapters: 3, read: 0, testament: 'NT', author: 'Pedro', era: '65–68 d.C.', theme: 'Alerta contra falsos mestres. Crescimento no conhecimento de Cristo.', genre: 'Carta' },
  { name: '1 João', abbr: '1Jo', chapters: 5, read: 5, testament: 'NT', author: 'João', era: '85–95 d.C.', theme: 'Comunhão com Deus. Amor como evidência da vida eterna.', genre: 'Carta' },
  { name: '2 João', abbr: '2Jo', chapters: 1, read: 1, testament: 'NT', author: 'João', era: '85–95 d.C.', theme: 'Andar na verdade e no amor. Guardar-se dos falsos mestres.', genre: 'Carta' },
  { name: '3 João', abbr: '3Jo', chapters: 1, read: 1, testament: 'NT', author: 'João', era: '85–95 d.C.', theme: 'Hospitalidade e integridade no serviço cristão.', genre: 'Carta' },
  { name: 'Judas', abbr: 'Jd', chapters: 1, read: 0, testament: 'NT', author: 'Judas', era: '65–80 d.C.', theme: 'Defesa da fé contra os que pervertem a graça.', genre: 'Carta' },
  { name: 'Apocalipse', abbr: 'Ap', chapters: 22, read: 0, testament: 'NT', author: 'João', era: '95 d.C.', theme: 'Visões da vitória final de Cristo. Esperança para a igreja perseguida.', genre: 'Profético / Apocalíptico' },
]

export function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function bookBySlug(slug: string) {
  return BOOKS.find((b) => slugify(b.name) === slug)
}
