// Textos de la web en español (idioma por defecto). Cada clave tiene que
// existir también en en.js y pt.js (lo comprueba tests/i18n.test.js).
// Los textos de la historia del Lore están aparte, en js/data/lore.es.js.
export default {
  // ---- Pestaña del navegador y buscadores ----
  'meta.title': 'NOVA 2 — SMP Modeado de Rol',
  'meta.description':
    'NOVA 2: la segunda temporada del SMP modeado de rol entre amigos. Descarga el modpack, únete al Discord y descubre la historia del mundo.',
  // ---- Pantalla de entrada ----
  'gate.label': 'Tocar para entrar',
  'gate.text': 'TOCA PARA ENTRAR',
  'gate.hint': '¿Estás seguro de que quieres entrar?',
  // ---- Arranque (texto de terminal) ----
  'boot.line1': 'SEÑAL PERDIDA...',
  'boot.line2': 'RECONECTANDO...',
  'boot.line3': 'SINTONIZANDO...',
  // ---- Intro ----
  'intro.download': 'Descargar Modpack',
  'intro.copyIp': 'Copiar IP',
  'intro.ipCopied': 'IP copiada',
  // ---- Selector de idioma ----
  'lang.label': 'Idioma',
  // ---- Cuenta atrás del siguiente evento (js/data/events.js) ----
  'countdown.days': 'días',
  'countdown.hours': 'horas',
  'countdown.minutes': 'min',
  'countdown.seconds': 'seg',
  'countdown.date': '{utc} UTC · En tu hora: {local}',
  'countdown.done': '¡Ha llegado la hora!',
  'countdown.addCalendar': 'Añadir al calendario',
  'countdown.icsDescription': 'Evento del servidor de Minecraft NOVA 2. IP: {ip}',
  // ---- Estado del servidor ----
  'status.online': 'Online · {online}/{max} jugadores',
  'status.onlineOne': 'Online · {online}/{max} jugador',
  'status.onlineNoCount': 'Online',
  'status.offline': 'Offline',
  // ---- Menús Lore / Normas ----
  'menu.lore': 'Lore',
  'menu.loreAntes': 'Antes del Nova',
  'menu.personajes': 'Personajes',
  'menu.cronica': 'Crónica',
  'menu.rules': 'Normas',
  // ---- Botón de sonido ----
  'audio.mute': 'Silenciar',
  'audio.muted': 'Sonido silenciado',
  // ---- Transición de canal ----
  'channel.text': 'SINTONIZANDO CANAL...',
  // ---- Botones comunes ----
  'common.back': '← Volver',
  'common.edit': 'Editar',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  // ---- Lore (el texto de la historia está en js/data/lore.es.js) ----
  'lore.prev': '← Anterior',
  'lore.next': 'Siguiente →',
  'lore.backToStart': 'Volver al inicio',
  // ---- Normas (admiten <strong>) ----
  'rules.tabObjetos': 'Objetos',
  'rules.discord.title': 'NORMAS · DISCORD',
  'rules.discord.intro': 'Estas reglas son para el servidor de Discord.',
  'rules.discord.1': '<strong>Edad:</strong> +17.',
  'rules.discord.2':
    '<strong>Ficha:</strong> Tendrán todo el tiempo que necesiten para hacer la ficha, incluso solo con poner info básica será válida.',
  'rules.discord.3':
    '<strong>Canales:</strong> Respeten la función de cada canal, estos fueron creados con un propósito específico.',
  'rules.discord.4':
    '<strong>Spam:</strong> Existe el canal correspondiente para compartir enlaces u otro tipo de mensajes repetitivos.',
  'rules.discord.5':
    '<strong>Comunicación:</strong> Si surge algún problema, incomodidad o malentendido con otro integrante, comunícate de manera respetuosa, preferiblemente que se resuelva en privado y no en medio del chat general. En caso de que la discusión vaya a peor, por favor comunicarse con un admin para resolver la situación de manera adecuada.',
  'rules.discord.6':
    '<strong>Incumplimiento:</strong> Dada la situación que algún miembro esté rompiendo alguna de las reglas, avisar a los administradores de inmediato.',
  'rules.discord.7':
    '<strong>Contenido sensible:</strong> Contenido +18, gore o similares, está prohibido. Se prohíbe todo contenido visual o textual que pueda resultar incómodo a otros integrantes. En caso de que sea algo relacionado con lore pedimos usar spoilers, o si es una imagen/dibujo enviarlo como spoiler y avisar del contenido (ej: Twt: sangre).',
  'rules.discord.8':
    '<strong>Relaciones:</strong> Es importante recordar que el rol se trata de interpretar personajes ficticios, no refleja la realidad ni las opiniones personales de los integrantes. Por lo tanto, se insta a los miembros a no tomarse personal el rol de alguien. Los conflictos o interacciones dentro del rol no deben afectar las relaciones personales.',
  'rules.discord.9':
    '<strong>Respeto:</strong> Se pide respeto a los demás, ya sea por gustos o por trastornos. Si alguno sufre de un trastorno y quiere que se comparta como un anuncio para que los demás puedan comprenderlo, hablarlo con un admin; si por el contrario prefiere decirlo por su cuenta a personas con quien interactúe, entonces pedimos respeto y comprensión de los demás integrantes. En caso de faltas de respeto (burlas, insultos, desprecio, aislamiento social, ignorar por su trastorno) será un baneo directo.',
  'rules.discord.10':
    '<strong>Inactividad:</strong> Si tienen algún problema personal y no pueden estar muy activos, pedimos decir su razón de inactividad en el canal correspondiente. También, si es posible, den un aproximado de su tiempo de inactividad para así tener en cuenta su justificación.',
  'rules.minecraft.title': 'NORMAS · MINECRAFT',
  'rules.minecraft.intro': 'Estas reglas son para el servidor de Minecraft.',
  'rules.minecraft.1':
    '<strong>Off rol:</strong> Dentro del servidor, cuando son interacciones con otros integrantes, la mayoría son on rol; en caso contrario por favor utilicen "//" para diferenciarlo. Respeten esto para poder distinguir.',
  'rules.minecraft.2':
    '<strong>Colaboración y respeto:</strong> Respeta las decisiones y acciones de otros personajes en la historia y colabora de manera constructiva para mantener la coherencia y el flujo narrativo. La comunicación abierta y el respeto mutuo son clave para una experiencia de rol positiva.',
  'rules.minecraft.3': '<strong>Portales:</strong> Se puede ir al Twilight Forest, al Nether y al End.',
  'rules.minecraft.4':
    '<strong>Spawn:</strong> En cuanto al spawn queda totalmente prohibido el uso de minas / robos de bloques o objetos en el lugar. Si el daño al spawn llega a ser por un creeper o algún mob, pedimos llamen a un admin para que este lo pueda arreglar.',
  'rules.minecraft.5':
    '<strong>Límite de adopciones:</strong> Si van a adoptar a otros cubitos el límite es de 4 adopciones (los huevitos también cuentan). Esto para evitar que los roles no se puedan realizar debido a que son familiares.',
  'rules.minecraft.6':
    '<strong>Borde del mundo:</strong> El límite de bloques es de 14000, esto para mantener el servidor optimizado y enfocado en el roleplay. Habrá un borde el cual, en caso de morir por cruzarlo, no se devolverán las cosas perdidas. El límite para hacer vuestra casa será hasta 5000.',
  'rules.minecraft.7':
    '<strong>Robo en casas ajenas:</strong> Está prohibido el robo masivo de objetos de casas ajenas a no ser que sea permitido y avisado tanto al staff como al usuario.',
  'rules.minecraft.8':
    '<strong>Cuentas ajenas (IAS):</strong> Hacer uso del IAS para entrar con cuentas con op NO TUYAS O SIN PERMISO será motivo de baneo de IP permanente.',
  'rules.objetos.title': 'NORMAS · OBJETOS',
  'rules.objetos.intro': 'Objetos cuyo uso u obtención está prohibido en el servidor.',
  'rules.objetos.1': '<strong>Anillo de Odín:</strong> Prohibido.',
  'rules.footer.1': 'Gracias por leer y formar parte de este servidor, queremos darte una buena experiencia.',
  'rules.footer.2':
    'Es importante recordar que estas medidas se implementan para mantener un ambiente de rol seguro y respetuoso para todos los participantes. ¡Gracias por su comprensión y colaboración!',
  // ---- Personajes ----
  'pj.signin': 'Entrar con Google',
  'pj.editName': 'Cambiar el nombre que ven los demás',
  'pj.mine': 'Mi personaje',
  'pj.create': 'Crear personaje',
  'pj.signout': 'Cerrar sesión',
  'pj.title': 'PERSONAJES',
  'pj.searchPlaceholder': 'Buscar personaje...',
  'pj.searchLabel': 'Buscar personaje',
  'pj.backToDirectory': '← Directorio',
  'pj.comments': 'Comentarios',
  'pj.commentPlaceholder': 'Deja un comentario...',
  'pj.commentLabel': 'Comentario',
  'pj.commentSubmit': 'Comentar',
  'pj.commentSigninHint': 'Inicia sesión para comentar.',
  'pj.editorCancel': '← Cancelar',
  'pj.fieldName': 'Nombre del personaje',
  'pj.fieldNamePlaceholder': 'Nombre',
  'pj.fieldMcUser': 'Usuario de Minecraft (opcional)',
  'pj.fieldMcUserPlaceholder': 'TuUsuarioDeMinecraft',
  'pj.fieldMcUserHint': 'Es opcional: si lo pones, se muestra como dato extra debajo de tu nombre en la ficha.',
  'pj.fieldPhoto': 'Link de foto de perfil (opcional)',
  'pj.fieldPhotoHint':
    'También vale un link de Pinterest: clic derecho sobre la imagen → "copiar dirección de imagen".',
  'pj.addText': '+ Texto',
  'pj.addImage': '+ Imagen',
  'pj.addRelation': '+ Relación',
  'pj.delete': 'Eliminar personaje',
  'pj.notConfigured': 'Personajes: falta configurar Firebase (ver firebase-config.js)',
  'pj.loading': 'Cargando personajes...',
  'pj.connectError': 'No se pudo conectar con Personajes. Revisa la conexión y recarga la página.',
  'pj.noMatches': 'Ningún personaje coincide con la búsqueda.',
  'pj.empty': 'Todavía no hay personajes. ¡Sé el primero!',
  'pj.noName': 'Sin nombre',
  'pj.loadError': 'No se pudieron cargar los personajes. Vuelve a entrar para reintentarlo.',
  'pj.gone': 'Ese personaje ya no existe.',
  'pj.openError': 'No se pudo abrir ese personaje.',
  'pj.commentsLoadError': 'No se pudieron cargar los comentarios.',
  'pj.noComments': 'Todavía no hay comentarios.',
  'pj.someone': 'Alguien',
  'pj.edited': '(editado)',
  'pj.newComments': '{n} comentarios nuevos',
  'pj.newCommentsOne': '1 comentario nuevo',
  'pj.newTag': 'Nuevo',
  'pj.deleteComment': 'Borrar comentario',
  'pj.deleteCommentError': 'No se pudo borrar el comentario.',
  'pj.editComment': 'Editar comentario',
  'pj.editCommentError': 'No se pudo editar el comentario.',
  'pj.commentError': 'No se pudo publicar el comentario. Inténtalo de nuevo.',
  'pj.openOwnError': 'No se pudo abrir tu personaje. Inténtalo de nuevo.',
  'pj.moveUp': 'Subir bloque',
  'pj.moveDown': 'Bajar bloque',
  'pj.removeBlock': 'Quitar bloque',
  'pj.relName': 'Nombre del otro personaje',
  'pj.relLabelPlaceholder': 'Relación (ej. hermano)',
  'pj.relLabel': 'Tipo de relación',
  'pj.textPlaceholder': 'Escribe aquí...',
  'pj.imagePlaceholder': 'Link de imagen (https://...)',
  'pj.spotifyPlaceholder': 'Link de Spotify (https://open.spotify.com/...)',
  'pj.textLabel': 'Texto del bloque',
  'pj.imageLabel': 'Link de la imagen',
  'pj.spotifyLabel': 'Link de Spotify',
  'pj.errNoName': 'Ponle un nombre a tu personaje.',
  'pj.errNameLong': 'El nombre es demasiado largo (máx. 60 caracteres).',
  'pj.errPhoto': 'El link de la foto debe empezar por http:// o https://',
  'pj.errMcUser': 'El usuario de Minecraft solo puede tener letras, números y "_" (máx. 16).',
  'pj.errRelation': 'Alguna relación no coincide con ningún personaje existente. Revisa el nombre.',
  'pj.saving': 'Guardando...',
  'pj.upload': 'Subir imagen',
  'pj.uploading': 'Subiendo imagen...',
  'pj.uploadDone': 'Imagen subida.',
  'pj.uploadFail': 'No se pudo subir la imagen. Prueba otra vez o pega un link.',
  'pj.uploadNotImage': 'Ese archivo no es una imagen.',
  'pj.uploadTooBig': 'La imagen pesa demasiado (máx. {mb} MB).',
  'pj.saveError': 'No se pudo guardar. Inténtalo de nuevo.',
  'pj.confirmDelete': '¿Seguro que quieres eliminar tu personaje? Esto no se puede deshacer.',
  'pj.deleting': 'Eliminando...',
  'pj.deleteError': 'No se pudo eliminar. Inténtalo de nuevo.',
  'pj.googleAccount': 'Cuenta de Google',
  'pj.signinOpening': 'Abriendo Google...',
  'pj.signinSlow':
    '¿No se abre la ventana de Google? Pulsa el botón otra vez; si sigue sin abrirse, permite las ventanas emergentes para esta web.',
  'pj.popupBlocked':
    'El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para esta web y vuelve a intentarlo.',
  'pj.signinError': 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.',
  'pj.promptName': '¿Qué nombre quieres que vean los demás en Personajes?',
  'pj.renameError': 'No se pudo cambiar el nombre.',
  'pj.mcUser': 'Usuario de Minecraft: {name}',
  'pj.fieldFaction': 'Facción (opcional)',
  'pj.fieldFactionPlaceholder': 'Reino del Norte',
  'pj.fieldFactionHint':
    'Elige una de la lista o escribe una nueva. Los personajes con el mismo nombre de facción salen juntos en el directorio y del mismo color en el árbol.',
  'pj.errFactionLong': 'La facción puede tener como mucho 40 caracteres.',
  'pj.faction': 'Facción: {name}',
  'pj.factionFilterLabel': 'Filtrar por facción',
  'pj.factionAll': 'Todas',
  'pj.treeLegendLabel': 'Facciones',
  'pj.treeBtn': 'Árbol de relaciones',
  // ---- Crónica (js/personajes/chronicle.js) ----
  'chron.btn': 'Crónica',
  'chron.title': 'CRÓNICA',
  'chron.intro':
    'Lo que va pasando en el servidor, contado por los jugadores. Las entradas más recientes salen primero.',
  'chron.fieldTitle': 'Título',
  'chron.fieldTitlePlaceholder': 'La caída de la torre norte',
  'chron.fieldText': 'Qué pasó',
  'chron.fieldImage': 'Link de una captura (opcional)',
  'chron.publish': 'Publicar',
  'chron.signinHint': 'Inicia sesión con Google para escribir en la crónica.',
  'chron.empty': 'Todavía no hay nada en la crónica. ¡Escribe la primera entrada!',
  'chron.meta': '{date} · {author}',
  'chron.metaEdited': '{date} · {author} (editado)',
  'chron.delete': 'Borrar entrada',
  'chron.confirmDelete': '¿Borrar esta entrada de la crónica?',
  'chron.errEmpty': 'Pon un título y cuenta qué pasó.',
  'chron.saveError': 'No se pudo guardar la entrada. Inténtalo de nuevo.',
  'chron.deleteError': 'No se pudo borrar la entrada.',
  'chron.loadError': 'No se pudo cargar la crónica.',
  'pj.treeTitle': 'RELACIONES',
  'pj.treeHint': 'Pulsa un personaje para ver su perfil. Para acercar: botones + / −, pellizco o la rueda del ratón.',
  'pj.treeZoomIn': 'Acercar',
  'pj.treeZoomOut': 'Alejar',
  'pj.treeZoomReset': 'Quitar el zoom',
  'pj.treeListTitle': 'Todas las relaciones',
  'pj.treeEmpty': 'Todavía no hay relaciones. Añade una desde tu personaje con «+ Relación».',
  'pj.treeIsolated': '{n} personajes sin relaciones no aparecen en el árbol.',
  'pj.treeIsolatedOne': '1 personaje sin relaciones no aparece en el árbol.',
  'pj.treeNodeLabel': 'Ver el perfil de {name}',
  // ---- Guías (admiten <strong>) ----
  'guides.open': 'Guías',
  'guides.tabStart': 'Empezar',
  'guides.tabWeb': 'La web',
  'guides.tabPj': 'Personajes',
  'guides.tabRel': 'Relaciones',
  'guides.start.title': 'GUÍA · EMPEZAR',
  'guides.start.intro': 'Lo básico para entrar a jugar al servidor.',
  'guides.start.1':
    '<strong>Modpack:</strong> Pulsa «Descargar Modpack» en la intro. El servidor usa Forge 1.20.1, así que necesitas esa versión de Forge con los mods del modpack.',
  'guides.start.2':
    '<strong>IP del servidor:</strong> Pulsa «Copiar IP» y pégala en Minecraft, en Multijugador → Añadir servidor.',
  'guides.start.3':
    '<strong>Estado del servidor:</strong> En la intro verás si el servidor está Online y cuántos jugadores hay. Se actualiza solo cada minuto; si no aparece, es que no se ha podido consultar.',
  'guides.start.4':
    '<strong>Normas:</strong> Antes de jugar, lee las normas de Discord, Minecraft y Objetos en el botón «Normas» (arriba a la derecha).',
  'guides.web.title': 'GUÍA · LA WEB',
  'guides.web.intro': 'Cómo moverte por la web.',
  'guides.web.1':
    '<strong>Entrar:</strong> La web empieza con la pantalla «Toca para entrar». Al pulsarla arranca la intro, con sonido.',
  'guides.web.2':
    '<strong>Sonido:</strong> El botón de abajo a la izquierda silencia o vuelve a activar el sonido. La web recuerda lo que elijas.',
  'guides.web.3':
    '<strong>Idioma:</strong> Con los botones ES · EN · PT de la intro cambias el idioma. Lo que escribe cada jugador (fichas y comentarios) no se traduce.',
  'guides.web.4':
    '<strong>Cuenta atrás:</strong> Abajo en la intro está el siguiente evento del servidor, con la fecha en UTC y en tu hora local. «Añadir al calendario» lo guarda en tu calendario.',
  'guides.web.5':
    '<strong>Lore:</strong> El botón «Lore» (arriba a la izquierda) abre «Antes del Nova», «Nova» y «Personajes». La historia se pasa con Anterior / Siguiente o con las flechas ← → del teclado.',
  'guides.web.6': '<strong>Volver:</strong> En cualquier página, «← Volver» o la tecla Esc te devuelven a la intro.',
  'guides.web.7':
    '<strong>Contraseña:</strong> El botón «Inserta la contraseña» (abajo a la derecha) esconde secretos. No te vamos a decir cuáles, pero si fallas tres veces seguidas aparece una ayudita.',
  'guides.pj.title': 'GUÍA · PERSONAJES',
  'guides.pj.intro': 'Cómo crear y editar la ficha de tu personaje.',
  'guides.pj.1':
    '<strong>Ver fichas:</strong> En Lore → Personajes cualquiera puede ver todos los personajes y buscarlos por nombre, sin cuenta.',
  'guides.pj.2':
    '<strong>Iniciar sesión:</strong> Para tener ficha propia pulsa «Entrar con Google». Si no se abre la ventana de Google, permite las ventanas emergentes para esta web. Cada cuenta de Google tiene un personaje.',
  'guides.pj.3':
    '<strong>Crear y editar:</strong> Pulsa «Crear personaje» (o «Mi personaje» si ya lo tienes) para abrir el editor. Solo tú puedes editar tu ficha.',
  'guides.pj.4':
    '<strong>Datos:</strong> Nombre (obligatorio, hasta 60 caracteres), usuario de Minecraft, facción y link de foto (los tres opcionales). La facción la eliges o la creas tú: los que escriban la misma salen juntos. De Pinterest vale: clic derecho sobre la imagen → «copiar dirección de imagen».',
  'guides.pj.5':
    '<strong>Bloques:</strong> Añade bloques de Texto, Imagen, Spotify o Relación (hasta 30) y cámbialos de orden con las flechas. En Spotify pega el link de una canción, álbum o playlist.',
  'guides.pj.6':
    '<strong>Guardar y eliminar:</strong> «Guardar» publica los cambios. «Eliminar personaje» borra la ficha para siempre.',
  'guides.pj.7':
    '<strong>Tu nombre:</strong> El lápiz ✎ junto a tu nombre cambia cómo te ven los demás, por ejemplo al firmar comentarios.',
  'guides.pj.8':
    '<strong>Comentarios:</strong> Con sesión iniciada puedes comentar cualquier ficha (hasta 500 caracteres) y editar o borrar tus comentarios. En tu propia ficha puedes borrar cualquier comentario. Si te escriben algo nuevo, «Mi personaje» muestra cuántos comentarios tienes sin leer (se actualiza solo) y en tu ficha salen marcados como «Nuevo».',
  'guides.pj.9':
    '<strong>Compartir:</strong> Al abrir una ficha, el enlace de la barra del navegador lleva directo a ese personaje. Cópialo para compartirlo.',
  'guides.pj.10':
    '<strong>Crónica:</strong> En Lore → Crónica (o el botón «Crónica» del directorio) está lo que va pasando en el servidor. Con sesión iniciada puedes publicar una entrada con título, texto y una captura, y editar o borrar las tuyas.',
  'guides.rel.title': 'GUÍA · RELACIONES',
  'guides.rel.intro': 'Cómo funciona el árbol de relaciones.',
  'guides.rel.1':
    '<strong>Añadir una relación:</strong> En el editor de tu ficha pulsa «+ Relación», escribe el nombre del otro personaje (se autocompleta) y el tipo de relación, por ejemplo «hermano». El otro personaje tiene que existir ya en la web.',
  'guides.rel.2':
    '<strong>En las dos fichas:</strong> La relación sale en tu ficha. Si el otro jugador también quiere tenerla en la suya, tiene que añadirla él.',
  'guides.rel.3':
    '<strong>El árbol:</strong> En Personajes, «Árbol de relaciones» dibuja las relaciones de todas las fichas. Los personajes sin ninguna relación no salen en el dibujo.',
  'guides.rel.4':
    '<strong>Moverse:</strong> Acerca o aleja con los botones + / −, pellizcando en el móvil o con la rueda del ratón. Pulsa un personaje para abrir su ficha.',
  'guides.rel.5':
    '<strong>Lista:</strong> Debajo del árbol está la lista de todas las relaciones, tal como las escribió cada jugador.',
  // ---- Buscador "Inserta la contraseña" ----
  'password.trigger': 'Inserta la contraseña',
  'password.placeholder': 'Inserta la contraseña',
  'password.search': 'Buscar',
  'password.nothing': 'Nada por aquí.',
  'password.hint': '¿Una ayudita?',
  // ---- Escena de Adán ----
  'adan.inputLabel': 'Responde',
  'adan.promptFirst': '¿Qué haces aquí?',
  'adan.promptReturn': 'Volviste.',
  'adan.promptThird': 'Otra vez tú.',
  'adan.noHesitation': 'No dudaste ni un segundo.',
  'adan.hesitated': 'Dudaste.',
  'adan.phrases': [
    { phrase: 'Quiero saber más', response: 'Nos arrepentimos de nuestro acto, ahora tenemos miedo.' },
    { phrase: 'Cuál es la verdad', response: 'No estáis listos para la respuesta.' },
    { phrase: 'Qué es el Hombre de Estática', response: 'Una víctima.' },
    { phrase: 'Cómo salgo de este mundo', response: 'Destruyéndolo.' },
    { phrase: 'Existe alguna sexta dimensión', response: 'No lo sé.' },
    { phrase: 'Dios existe', response: 'Si existiera, sería todopoderoso.' },
    { phrase: 'Hay alguien vivo', response: 'Todos están muertos, menos yo y padre.' },
  ],
  'adan.returnPhrase': { phrase: 'Aquí estoy otra vez', response: 'Sabíamos que volverías.' },
  'adan.thirdPhrase': { phrase: 'Sigo aquí', response: 'Lo sé. Por eso vuelvo yo también.' },
};
