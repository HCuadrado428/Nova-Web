// ======================================================
// Textos del Lore (datos, sin lógica): lo que se edita para
// cambiar la historia. Los pinta js/lore.js.
// ======================================================

/* ---------------------------------------------------
   Lore (formato pases: imagen, texto, vídeo o revelación final)
   Hay dos pistas independientes, cada una con su propio botón y su propio
   "Volver al inicio" al final: LORE_TRACKS.antes y LORE_TRACKS.nova.
   Cada elemento de una pista es un pase:
     { type: 'title' }                             -> portada con el título
     { type: 'text', heading, centered, paragraphs: [...] } -> bloque de texto
       (heading y centered son opcionales)
     { type: 'image', src: '...' }                  -> foto a pantalla completa
     { type: 'video', src: '...', poster }           -> vídeo con controles
       (poster opcional: imagen que se ve antes de darle a play)
     { type: 'reveal', src: '...', text: '...' }     -> foto + texto enorme,
                                                         temblando y glitcheado
   Un párrafo puede ser un string normal (se pinta como HTML, así que vale
   un <br> para saltar de línea), o un objeto
   { text, emphasis: true } para destacarlo (rojo, más grande).
   Añade o reordena pases aquí; no hace falta tocar el HTML ni js/lore.js,
   que es quien los pinta.
--------------------------------------------------- */
export const LORE_TRACK_ANTES = [
  {
    type: 'text',
    heading: '𝐈.',
    paragraphs: [
      'A veces la humanidad te cansa. No de golpe, sino poco a poco, con los mismos errores repitiéndose una y otra vez. Hay personas que dicen que siempre hay que buscar el lado bueno, que incluso en los peores momentos se puede aprender algo. Él pensó eso durante mucho tiempo, lo intentó. Después de ver los mismos patrones durante años, la idea empezó a parecerle una excusa más que una verdad.',
      'Con el tiempo llegó a una conclusión simple:<br>La humanidad no fallaba por falta de oportunidades, fallaba porque no sabía convivir sin destruir algo en el proceso. Y si eso era cierto, entonces no bastaba con discutirlo o escribir teorías. Había que probarlo.',
      'Así nació la idea de crear un mundo aislado. Un lugar donde nadie pudiera culpar al pasado, al gobierno o a la historia. Donde las personas fueran libres para decidir qué tipo de sociedad querían formar. Si aun así todo terminaba en conflicto, no habría excusas.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐈.',
    paragraphs: [
      'Hubo un intento anterior, hace años. Hoy casi nadie lo recuerda con claridad. Solo quedan referencias vagas, archivos incompletos y rumores sobre un experimento que prometía armonía y terminó mal. Cuando sus habitantes descubrieron que estaban siendo parte de un experimento, todo se vino abajo. El gobierno lo negó, los responsables desaparecieron y el tema fue enterrado.',
      'Pero él no lo dejó atrás. Para él, ese fracaso no significaba que la idea fuera incorrecta, solo que no se había hecho bien.',
      'Muchos creyeron que el responsable había desaparecido junto con aquel proyecto. Era más fácil pensar eso. Pero la verdad era otra.',
      'Mucho antes de ese experimento, él ya había tenido contacto con algo que no pertenecía a este mundo. Una isla que no aparecía en ningún registro, separada del mapa conocido. Allí existía una entidad que se hacía llamar a sí misma dios, aunque aún no entendía completamente lo que eso implicaba.',
      'El encuentro no terminó bien. Fue expulsado y obligado a regresar. Pero esa experiencia le dejó algo importante, entendió que existían otros mundos, que podían observarse sin intervenir directamente y que no siempre era necesario controlar para influir.',
      'Años después, cuando el primer experimento fue borrado de la historia oficial, ese conocimiento volvió a ser útil.',
      'Y con esa idea comenzó a tomar forma NOVA.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐈𝐈.',
    paragraphs: [
      'NovaSMP no fue creado por una sola persona. Fue el resultado de lo que quedó de una organización científica que, en los documentos oficiales, ya no existía. La antigua Federación había sido disuelta, pero varios de sus miembros conservaron información, tecnología y el deseo de continuar.',
      'Nova island se presentó como un nuevo comienzo. Un experimento más cuidado, más controlado. La idea no era forzar el conflicto, sino crear las condiciones necesarias y observar qué pasaba. Si la humanidad realmente podía cambiar, lo demostraría sin ayuda.',
      'La Federación ya no tenía nombre público, pero seguía activa en las sombras.',
      'El reclutamiento fue simple y discreto. No hubo contratos ni reuniones privadas. Solo anuncios comunes, fáciles de ignorar, que aparecían en el momento justo para ciertas personas que eran estudiadas con antelación. Personas normales aceptaron sin saber exactamente a qué se estaban comprometiendo. Cuando despertaron, ya no estaban en su mundo. Frente a ellos había una isla desconocida, tranquila y extrañamente vacía.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐕.',
    paragraphs: [
      'Nova estaba pensada para parecer un lugar justo. En el centro había una ciudad comunitaria donde todos podían reunirse, comerciar y hablar. No pertenecía a nadie en específico. Era un punto neutral.',
      'Más allá de ella se formaron dos pueblos principales: Estelar y Génesis. Nadie les prohibió relacionarse, pero tampoco se les dio una razón clara para hacerlo. Cada uno tuvo que organizarse por su cuenta, cuidar sus recursos y tomar sus propias decisiones. Con el tiempo, las diferencias empezaron a notarse.',
      'Cada que llegaba alguien nuevo lo hacían elegir un pueblo de un método creado automáticamente para llevarte a uno de los dos pueblos, era algo aleatorio que no podían elegir.',
      'Los que estaban detrás no se mostraron directamente. En su lugar, dejó que ciertos individuos cumplieran ese rol. Personas con máscaras de animales, conocidas por nombres que pronto se volvieron familiares.',
      '(Nombres censurados)',
      'Supervisaban comunidades, corregían comportamientos, borraban recuerdos cuando era necesario. A veces provocaban pequeños conflictos, aplicaban castigos disfrazados de eventos y mucho más.',
      'Para los habitantes de Nova, eran autoridades. Para quienes estaban detrás del experimento, solo eran herramientas.',
    ],
  },
  {
    type: 'text',
    heading: '𝐕.',
    centered: true,
    paragraphs: [
      'Nova no fue creada para destruir.',
      'Fue creada para observar.',
      'Para responder una sola pregunta:',
      'Si se les da libertad, un propósito y un nuevo comienzo,',
      '¿la humanidad puede hacerlo mejor?',
      'El experimento sigue en marcha.',
      { text: 'Este mundo va a dar la respuesta', emphasis: true },
    ],
  },
  { type: 'video', src: 'images/lv_0_20260207170013.mp4', poster: 'images/lore-video-poster.jpg' },
];

export const LORE_TRACK_NOVA = [
  { type: 'title' },
  { type: 'image', src: 'images/Lore-1.webp', alt: 'Dos figuras humanoides con capucha blanca en una sala oscura: una con ojos brillantes en cian, la otra con ojos rojos sosteniendo un arma.' },
  {
    // Lore-1
    type: 'text',
    paragraphs: [
      'Habían llegado de vacaciones a una isla, en sus televisiones apareció ese anuncio, genuino, uno que parecía inofensivo, el relajo de esas olas en la pantalla sonaba exquisito al lado de todo a lo que se enfrentarían, una realidad que solo a pesar de que no comienza en gritos ni guerra, tarde o temprano pasaría a ser oídos sordos en los habitantes que en algún momento lucharon por lo que querían, una libertad que no llegaría, al menos un problema en común, ser presos para lo que fueron sometidos.',
      'La Federación lo tenía claro, solo aquellos que actuaron bajo el propósito, para lo que fueron creados, un experimento lleno de memorias, matanzas que llegaron a consecuencias atroces, hijos - si es que se les podía llamar así- llevados al límite en donde el amor paternal llegaba a corromperse, eso era algo sentimental, los sentimientos aquí eran cruciales para que todo estuviera controlado, humanos, solo la mente humana es débil ante lo que se desconoce y te produce miedo, pero.. ¿Qué ocurriría si algo que no era humano llegara a suceder en esa mente?',
    ],
  },
  { type: 'image', src: 'images/Lore-2.webp', alt: 'Tres personajes sentados en el borde de un acantilado, mirando la puesta de sol sobre el océano.' },
  {
    // Lore-2
    type: 'text',
    paragraphs: [
      'La paz llegó, es a lo que se creían algunos llegar, pero supongo que una opción, una idea así era algo cruel de pensar en un lugar donde lo único a lo que se llegaba era a tratar de simplemente huir. Las fallas no tardaron en aparecer, lo desconocido como antes se menciono, te aterra, te hunde, te hace querer escapar de lo que no puedes evitar, manchas, una o dos, aparecieron como si de una infección se tratara, pero esto no era humano, no, no lo era, seguramente algo hecho por la Federación, pero ni ellos mismos pudieron salvarse de algo que, en efecto, no fue obra de alguna otra de sus extrañezas. Los habitantes no tardaron en aparecer preguntando si esto era digno de combatir, pero al primer caído con manchas glitcheadas, un dolor indescriptible que solo se podía ver en los ojos de aquel primero que la curiosidad terminó por matarlo, se dieron cuenta de que no solo ellos eran los que debían irse, si no todos en la isla, incluyendo a todo aquel con vida ahí.',
      'Esto era solo el comienzo, eso a lo que algunos empezaron a nombrar como entes, comenzaron a acechar, al final de cuentas consumir vida era algo que los alimentaba como primeras impresiones de algo vivo, algo vital que es importante para que el experimento siga funcionando, vida. No había mucho tiempo, pensaban en semanas para escapar pero esas criaturas solo se tomaron dos días para consumir e incluso desaparecer de a poco lo que quedaba de la isla. Su única salvación no estaba en algo que se consideraba tierra, era ese mundo al que nadie o pocos accedían, el End.',
    ],
  },
  { type: 'image', src: 'images/lore-3.jpg' },
  {
    // Lore-3
    type: 'text',
    paragraphs: [
      'Al entrar se dieron cuenta que no todo estaba en su lugar, la Federación dio una señal de que algo andaba mal, la amenaza estaba vigente en el aire que pasaba por los árboles presentes que, aunque parecían bastante normal, la presencia de esas cosas eran capaces de sentirlas, daban escalofríos, y el recuerdo de esas personas gritando por ayuda porque algo los había glicheado te acompaña mientras avanzas a lo que se supone era un camino seguro.',
      'Cuatro, cuatro llaves que necesitaban para llegar a el destino que no era más que volver a lo mismo, esa normalidad disfrazada de algo cruel, pero en estos casos era mejor eso a terminar muertos por algo que ni la federación ni los habitantes estaban seguros de lo que realmente era.',
      'Los minutos pasaban y esas cuatro llaves no aparecían por ningún lado, los puntos ciegos de esas entidades fueron revisadas, pero nada, lo que llevaba a pensar, no solo eso, estar seguro de que ellos ya se habían adelantado, lo que en resumen era un enfrentamiento que no sabían como terminaria, pensaban en no unir fuerzas por tantas diferencias dadas pero, los habitantes y la Federación de alguna manera sabían que si no se unían, ambos morirían, eso era lo que tenían en común, querer seguir vivos a toda costa, si eso involucra el que olvidan por completo, aunque sea por este momento, todo el sufrimiento que se dieron mutuamente, eso en momentos como este, ya no importaba las diferencias, si la vida de los dos estaban en riesgo lo último que se les pasó por la mente fue algunas de esas escenas que aunque no serían borradas, la adrenalina los cegó.',
    ],
  },
  { type: 'image', src: 'images/lore-4.webp', alt: 'Tres figuras pálidas y encapuchadas de pie, muy juntas entre sí.' },
  {
    // Lore-4
    type: 'text',
    paragraphs: [
      'Se pusieron en marcha y aunque ese enfrentamiento hubieron bajas por parte de los habitantes, la federación ya planeaba cómo derrotar a la gran dragona que les daría la libertad que buscaban, aunque esa libertad tampoco era asegurada, al menos los mantendrá a salvo. Gritos se escuchaban, gente siendo devorada por lo que decíamos desconocido, era un campo de batalla en donde los últimos en respirar ganan, luchando como si de animales se tratara, ¿esto no era el punto a lo que la federación quería llegar?, el que unos simples humanos se dieran cuenta de que no solo pueden ser manipulables o experimentales, si no que cada uno al final del día busca sobrevivir a lo que más teme.',
      'Esas entidades de un momento a otro dejaron de dar presencia, cada vez menos pero no del todo, heridas causadas por ellos se hacían visibles en su forma caracterizada por saber que para ti no quedaba mucho tiempo mas de vida, así se despiden, asi sabian que aunque trataran de sanar, su camino era a un laboratorio o aún peor, ser colocados y conscientes de que su humanidad nunca más estaría de vuelta. Derrotando a la dragona se abrió paso para que ese nuevo lugar pudiera ser su salida, el portal estaba en las narices de unos y de otros una lejanía a la que empezaron a correr, algunos no con tanta suerte, otros pensando en que harían cuando esto terminara, pero de lo que estaban seguros o al menos la mayoría era que el caos había acabado, ¿no es así?, al menos esa sensación desapareció, y era lo que contaba.',
      'Uno tras otro fueron entrando, un nuevo comienzo, pero lo único que les hacía sentir iguales era el simple hecho de que estaban atrapados de alguna u otra manera, uno tras otro, poco a poco observando, y cuando fue la última persona quisieron asegurarse de que el portal estaba cerrado, así no llegaría gente nueva con la cual lidiar, gente nueva con la cual experimentar, gente que no era de este lugar, de cualquier manera no podrían llegar.',
    ],
  },
  {
    // Lore-5: la revelación final, sobre la foto de lore-5
    type: 'reveal',
    src: 'images/lore-5.webp',
    alt: 'Interior de un templo submarino en ruinas, con enredaderas y bloques cubiertos de musgo.',
    text: 'Pero tú no eres de este lugar.',
  },
];

export const LORE_TRACKS = {
  antes: LORE_TRACK_ANTES,
  nova: LORE_TRACK_NOVA,
};
