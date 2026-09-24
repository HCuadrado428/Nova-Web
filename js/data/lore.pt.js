// ======================================================
// Textos do Lore em português do Brasil (só dados). Mesma estrutura que
// lore.es.js (o original em espanhol): as mesmas passagens, na mesma ordem,
// com as mesmas imagens. O formato de cada passagem está explicado no
// começo de lore.es.js.
// ======================================================

export const LORE_TRACK_ANTES = [
  {
    type: 'text',
    heading: '𝐈.',
    paragraphs: [
      'Às vezes a humanidade cansa. Não de uma vez, mas pouco a pouco, com os mesmos erros se repetindo sem parar. Há quem diga que sempre é preciso procurar o lado bom, que até nos piores momentos dá para aprender alguma coisa. Ele pensou assim por muito tempo, tentou. Depois de ver os mesmos padrões durante anos, a ideia começou a lhe parecer mais uma desculpa do que uma verdade.',
      'Com o tempo, chegou a uma conclusão simples:<br>A humanidade não falhava por falta de oportunidades; falhava porque não sabia conviver sem destruir algo no caminho. E se isso fosse verdade, não bastava discutir ou escrever teorias. Era preciso provar.',
      'Assim nasceu a ideia de criar um mundo isolado. Um lugar onde ninguém pudesse culpar o passado, o governo ou a história. Onde as pessoas fossem livres para decidir que tipo de sociedade queriam formar. Se mesmo assim tudo terminasse em conflito, não haveria desculpas.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐈.',
    paragraphs: [
      'Houve uma tentativa anterior, anos atrás. Hoje quase ninguém se lembra dela com clareza. Restam apenas referências vagas, arquivos incompletos e rumores sobre um experimento que prometia harmonia e terminou mal. Quando seus habitantes descobriram que faziam parte de um experimento, tudo desmoronou. O governo negou, os responsáveis desapareceram e o assunto foi enterrado.',
      'Mas ele não deixou isso para trás. Para ele, aquele fracasso não significava que a ideia estivesse errada, apenas que não tinha sido bem-feita.',
      'Muitos acreditaram que o responsável tinha desaparecido junto com aquele projeto. Era mais fácil pensar assim. Mas a verdade era outra.',
      'Muito antes daquele experimento, ele já tinha tido contato com algo que não pertencia a este mundo. Uma ilha que não aparecia em nenhum registro, separada do mapa conhecido. Lá existia uma entidade que se chamava a si mesma de deus, embora ainda não entendesse completamente o que isso significava.',
      'O encontro não terminou bem. Ele foi expulso e obrigado a voltar. Mas essa experiência lhe deixou algo importante: entendeu que existiam outros mundos, que podiam ser observados sem intervir diretamente e que nem sempre era necessário controlar para influenciar.',
      'Anos depois, quando o primeiro experimento foi apagado da história oficial, esse conhecimento voltou a ser útil.',
      'E com essa ideia, NOVA começou a tomar forma.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐈𝐈.',
    paragraphs: [
      'O NovaSMP não foi criado por uma única pessoa. Foi o resultado do que restou de uma organização científica que, nos documentos oficiais, já não existia. A antiga Federação tinha sido dissolvida, mas vários de seus membros guardaram informações, tecnologia e a vontade de continuar.',
      'A ilha Nova foi apresentada como um novo começo. Um experimento mais cuidadoso, mais controlado. A ideia não era forçar o conflito, mas criar as condições necessárias e observar o que acontecia. Se a humanidade realmente pudesse mudar, provaria isso sem ajuda.',
      'A Federação já não tinha nome público, mas continuava ativa nas sombras.',
      'O recrutamento foi simples e discreto. Não houve contratos nem reuniões privadas. Apenas anúncios comuns, fáceis de ignorar, que apareciam no momento certo para certas pessoas estudadas com antecedência. Pessoas normais aceitaram sem saber exatamente com o que estavam se comprometendo. Quando acordaram, já não estavam no seu mundo. Diante delas havia uma ilha desconhecida, tranquila e estranhamente vazia.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐕.',
    paragraphs: [
      'Nova foi pensada para parecer um lugar justo. No centro havia uma cidade comunitária onde todos podiam se reunir, negociar e conversar. Não pertencia a ninguém em específico. Era um ponto neutro.',
      'Além dela, formaram-se duas vilas principais: Estelar e Génesis. Ninguém as proibiu de se relacionar, mas também ninguém lhes deu um motivo claro para isso. Cada uma teve que se organizar por conta própria, cuidar dos seus recursos e tomar as próprias decisões. Com o tempo, as diferenças começaram a aparecer.',
      'Toda vez que chegava alguém novo, um método automático o levava a uma das duas vilas. Era aleatório; ninguém podia escolher.',
      'Os que estavam por trás não se mostraram diretamente. Em vez disso, deixaram que certos indivíduos cumprissem esse papel. Pessoas com máscaras de animais, conhecidas por nomes que logo se tornaram familiares.',
      '(Nomes censurados)',
      'Supervisionavam comunidades, corrigiam comportamentos, apagavam memórias quando era necessário. Às vezes provocavam pequenos conflitos, aplicavam castigos disfarçados de eventos e muito mais.',
      'Para os habitantes de Nova, eram autoridades. Para quem estava por trás do experimento, eram apenas ferramentas.',
    ],
  },
  {
    type: 'text',
    heading: '𝐕.',
    centered: true,
    paragraphs: [
      'Nova não foi criada para destruir.',
      'Foi criada para observar.',
      'Para responder a uma única pergunta:',
      'Se lhes derem liberdade, um propósito e um novo começo,',
      'a humanidade consegue fazer melhor?',
      'O experimento continua em andamento.',
      { text: 'Este mundo vai dar a resposta', emphasis: true },
    ],
  },
  { type: 'video', src: 'images/lv_0_20260207170013.mp4', poster: 'images/lore-video-poster.jpg' },
];

export const LORE_TRACK_NOVA = [
  { type: 'title' },
  {
    type: 'image',
    src: 'images/Lore-1.webp',
    alt: 'Duas figuras humanoides com capuz branco em uma sala escura: uma com olhos brilhando em ciano, a outra com olhos vermelhos segurando uma arma.',
  },
  {
    // Lore-1
    type: 'text',
    paragraphs: [
      'Tinham chegado de férias a uma ilha. Nas televisões apareceu aquele anúncio, genuíno, um que parecia inofensivo. O relaxar daquelas ondas na tela soava delicioso ao lado de tudo o que iriam enfrentar: uma realidade que, embora não comece com gritos nem guerra, cedo ou tarde cairia em ouvidos surdos entre os habitantes que um dia lutaram pelo que queriam. Uma liberdade que não chegaria. Ao menos tinham um problema em comum: serem prisioneiros daquilo a que foram submetidos.',
      'A Federação tinha isso claro: apenas aqueles que agiram de acordo com o propósito para o qual foram criados. Um experimento cheio de memórias, de massacres que chegaram a consequências atrozes, de filhos —se é que podiam ser chamados assim— levados ao limite, onde o amor paterno chegava a se corromper. Essa era a parte sentimental; aqui, os sentimentos eram cruciais para manter tudo sob controle. Humanos. Só a mente humana é fraca diante do desconhecido e do que lhe causa medo. Mas... o que aconteceria se algo que não era humano se apoderasse dessa mente?',
    ],
  },
  {
    type: 'image',
    src: 'images/Lore-2.webp',
    alt: 'Três personagens sentados na beira de um penhasco, olhando o pôr do sol sobre o oceano.',
  },
  {
    // Lore-2
    type: 'text',
    paragraphs: [
      'A paz chegou, ou assim alguns acreditavam. Mas suponho que uma opção, uma ideia assim, era cruel de se pensar num lugar onde a única coisa que se buscava era simplesmente fugir. As falhas não demoraram a aparecer. O desconhecido, como já foi dito, te aterroriza, te afunda, te faz querer escapar do que você não pode evitar. Manchas, uma ou duas, apareceram como se fosse uma infecção. Mas isto não era humano, não, não era. Com certeza algo feito pela Federação, mas nem eles mesmos conseguiram se salvar de algo que, de fato, não era obra de nenhuma de suas outras estranhezas. Os habitantes logo apareceram perguntando se aquilo era digno de ser combatido. Mas com o primeiro a cair coberto de manchas glitchadas —uma dor indescritível que só se via nos olhos daquele primeiro que a curiosidade acabou matando— perceberam que não eram só eles que precisavam ir embora, mas todos na ilha, todo aquele que estivesse vivo ali.',
      'Isso era só o começo. Aquilo que alguns começaram a chamar de entes passou a espreitá-los. Afinal, consumir vida era o que os alimentava, a primeira impressão de algo vivo, algo vital de que o experimento precisa para continuar funcionando: vida. Não havia muito tempo. Pensavam ter semanas para escapar, mas aquelas criaturas levaram apenas dois dias para consumir, e até apagar aos poucos, o que restava da ilha. Sua única salvação não estava em nada que se pudesse chamar de terra; era aquele mundo onde poucos ou ninguém entrava: o End.',
    ],
  },
  { type: 'image', src: 'images/lore-3.jpg' },
  {
    // Lore-3
    type: 'text',
    paragraphs: [
      'Ao entrar, perceberam que nem tudo estava no lugar. A Federação deu um sinal de que algo estava errado. A ameaça pairava no ar que passava pelas árvores, que, embora parecessem bastante normais, carregavam a presença daquelas coisas; dava para senti-la. Causava arrepios. E a lembrança daquelas pessoas gritando por socorro porque algo as tinha glitchado te acompanha enquanto você avança pelo que supostamente era um caminho seguro.',
      'Quatro. Quatro chaves de que precisavam para chegar a um destino que não era mais do que voltar ao mesmo: aquela normalidade disfarçada de algo cruel. Mas, em casos como este, isso era melhor do que acabar morto por algo que nem a Federação nem os habitantes sabiam ao certo o que era.',
      'Os minutos passavam e aquelas quatro chaves não apareciam em lugar nenhum. Os pontos cegos daquelas entidades foram revistados, mas nada, o que levava a pensar —não, a ter certeza— de que elas tinham chegado antes. Em resumo, um confronto sem final previsível. Pensaram em não unir forças por tantas diferenças, mas, de alguma forma, os habitantes e a Federação sabiam que, se não se unissem, ambos morreriam. Era isso o que tinham em comum: querer continuar vivos a qualquer custo, mesmo que isso significasse esquecer por completo, ao menos por enquanto, todo o sofrimento que causaram um ao outro. Em momentos como este, as diferenças já não importavam. Com a vida dos dois em risco, a última coisa que lhes passou pela cabeça foram aquelas cenas que, embora nunca fossem apagadas, a adrenalina acabou cegando.',
    ],
  },
  {
    type: 'image',
    src: 'images/lore-4.webp',
    alt: 'Três figuras pálidas e encapuzadas de pé, muito próximas umas das outras.',
  },
  {
    // Lore-4
    type: 'text',
    paragraphs: [
      'Puseram-se a caminho e, embora nesse confronto houvesse baixas entre os habitantes, a Federação já planejava como derrotar a grande dragoa que lhes daria a liberdade que buscavam. Essa liberdade também não era garantida, mas ao menos os manteria a salvo. Ouviam-se gritos, gente sendo devorada pelo que chamávamos de desconhecido. Era um campo de batalha onde os últimos a respirar vencem, lutando como se fossem animais. Não era este o ponto a que a Federação queria chegar? Que simples humanos percebessem que não são apenas manipuláveis ou experimentais, mas que cada um, no fim do dia, busca sobreviver àquilo que mais teme.',
      'De um momento para o outro, aquelas entidades deixaram de se mostrar, cada vez menos, mas não por completo. Feridas causadas por elas ficavam visíveis em sua forma característica, aquela que diz que já não resta muito tempo de vida. É assim que se despedem; assim sabiam que, mesmo que tentassem se curar, seu caminho levava a um laboratório ou, pior ainda, a serem colocados ali conscientes de que sua humanidade nunca mais voltaria. Derrotar a dragoa abriu caminho para que aquele novo lugar fosse a saída. O portal estava debaixo do nariz de uns e, para outros, a uma distância pela qual começaram a correr. Alguns não tiveram tanta sorte; outros pensavam no que fariam quando isso acabasse. Mas do que tinham certeza, ou pelo menos a maioria, era que o caos tinha terminado, não é? Ao menos aquela sensação desapareceu, e era isso o que importava.',
      'Um após o outro, foram entrando. Um novo começo, mas a única coisa que os fazia se sentir iguais era o simples fato de estarem presos, de um jeito ou de outro. Um após o outro, pouco a pouco, observando. E quando passou a última pessoa, quiseram garantir que o portal estava fechado. Assim não chegaria gente nova com quem lidar, gente nova com quem experimentar, gente que não era deste lugar. De qualquer forma, não conseguiriam chegar.',
    ],
  },
  {
    // Lore-5: a revelação final, sobre a foto de lore-5
    type: 'reveal',
    src: 'images/lore-5.webp',
    alt: 'Interior de um templo submarino em ruínas, com trepadeiras e blocos cobertos de musgo.',
    text: 'Mas você não é deste lugar.',
  },
];

export const LORE_TRACKS = {
  antes: LORE_TRACK_ANTES,
  nova: LORE_TRACK_NOVA,
};
