// Tests de firestore.rules contra el emulador de Firestore.
// Se lanzan con: npm run test:rules (arranca el emulador, pasa esto y lo para).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nova',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const base = () => ({
  nombre: 'Alicia',
  minecraftUsername: null,
  faccion: null,
  fotoUrl: null,
  bloques: [],
  actualizadoEn: serverTimestamp(),
});
const nuevo = (extra = {}) => ({ ...base(), creadoEn: serverTimestamp(), ...extra });
const seed = (path, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
const seedPersonaje = (uid, extra = {}) =>
  seed(`personajes/${uid}`, { ...base(), actualizadoEn: Timestamp.now(), creadoEn: Timestamp.now(), ...extra });

describe('personajes', () => {
  test('crear el tuyo (como la web)', () => assertSucceeds(setDoc(doc(db('alice'), 'personajes/alice'), nuevo())));
  test('crear con foto, usuario de MC y bloques', () =>
    assertSucceeds(
      setDoc(
        doc(db('bob'), 'personajes/bob'),
        nuevo({
          minecraftUsername: 'Bob_123',
          fotoUrl: 'https://i.pinimg.com/x.jpg',
          bloques: [{ id: '1', tipo: 'texto', contenido: 'hola' }],
        }),
      ),
    ));
  test('crear con facción', () =>
    assertSucceeds(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ faccion: 'Reino del Norte' }))));
  test('NO: facción de más de 40 caracteres', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ faccion: 'x'.repeat(41) }))));
  test('NO: facción que no es texto', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ faccion: 7 }))));
  test('crear caído, con fecha y epitafio', () =>
    assertSucceeds(
      setDoc(
        doc(db('bob'), 'personajes/bob'),
        nuevo({ estado: 'caido', caidoEl: '2026-10-03', epitafio: 'Cayó defendiendo la torre.' }),
      ),
    ));
  test('crear desaparecido, sin fecha ni epitafio', () =>
    assertSucceeds(
      setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ estado: 'desaparecido', caidoEl: null, epitafio: null })),
    ));
  test('NO: estado desconocido', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ estado: 'inmortal' }))));
  test('NO: fecha de caída que no es AAAA-MM-DD', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ estado: 'caido', caidoEl: '3/10/2026' }))));
  test('NO: epitafio de más de 140 caracteres', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ estado: 'caido', epitafio: 'x'.repeat(141) }))));
  test('NO: crear el de otra persona', () => assertFails(setDoc(doc(db('bob'), 'personajes/alice'), nuevo())));
  test('NO: anónimo', () => assertFails(setDoc(doc(db(null), 'personajes/x'), nuevo())));
  test('NO: campo extra', () => assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ admin: true }))));
  test('NO: fecha inventada', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ creadoEn: Timestamp.fromMillis(0) }))));
  test('NO: fotoUrl javascript:', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ fotoUrl: 'javascript:alert(1)' }))));
  test('NO: usuario de MC inválido', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ minecraftUsername: 'no vale!' }))));
  test('NO: sin nombre', () => assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ nombre: '' }))));
  test('NO: más de 30 bloques', () =>
    assertFails(setDoc(doc(db('bob'), 'personajes/bob'), nuevo({ bloques: Array(31).fill({ tipo: 'texto' }) }))));

  test('editar el tuyo (como la web)', async () => {
    await seedPersonaje('alice');
    await assertSucceeds(updateDoc(doc(db('alice'), 'personajes/alice'), { ...base(), nombre: 'Alicia 2' }));
  });
  test('editar uno antiguo sin minecraftUsername', async () => {
    await seed('personajes/carol', {
      nombre: 'Carol',
      fotoUrl: null,
      bloques: [],
      actualizadoEn: Timestamp.now(),
      creadoEn: Timestamp.now(),
    });
    await assertSucceeds(updateDoc(doc(db('carol'), 'personajes/carol'), { ...base(), nombre: 'Carol' }));
  });
  test('NO: editar reescribiendo creadoEn', async () => {
    await seedPersonaje('alice');
    await assertFails(
      updateDoc(doc(db('alice'), 'personajes/alice'), { ...base(), creadoEn: Timestamp.fromMillis(0) }),
    );
  });
  test('NO: editar el de otra persona', async () => {
    await seedPersonaje('alice');
    await assertFails(updateDoc(doc(db('bob'), 'personajes/alice'), base()));
  });
  test('borrar el tuyo', async () => {
    await seedPersonaje('bob');
    await assertSucceeds(deleteDoc(doc(db('bob'), 'personajes/bob')));
  });
  test('NO: borrar el de otra persona', async () => {
    await seedPersonaje('bob');
    await assertFails(deleteDoc(doc(db('alice'), 'personajes/bob')));
  });
});

describe('comentarios', () => {
  const comentarios = (uid) => collection(db(uid), 'personajes/alice/comentarios');
  const comentario = (extra = {}) => ({
    autorUid: 'bob',
    autorNombre: 'Bob',
    texto: 'Buen personaje',
    creadoEn: serverTimestamp(),
    ...extra,
  });
  const seedComentario = () => seed('personajes/alice/comentarios/c1', { ...comentario(), creadoEn: Timestamp.now() });
  const c1 = (uid) => doc(db(uid), 'personajes/alice/comentarios/c1');

  test('comentar (como la web)', () => assertSucceeds(addDoc(comentarios('bob'), comentario())));
  test('NO: suplantando autorUid', () => assertFails(addDoc(comentarios('bob'), comentario({ autorUid: 'alice' }))));
  test('NO: fecha inventada', () =>
    assertFails(addDoc(comentarios('bob'), comentario({ creadoEn: Timestamp.fromMillis(0) }))));
  test('NO: campo extra', () => assertFails(addDoc(comentarios('bob'), comentario({ fijado: true }))));
  test('NO: nombre de autor de 200 caracteres', () =>
    assertFails(addDoc(comentarios('bob'), comentario({ autorNombre: 'x'.repeat(200) }))));
  test('NO: comentario vacío', () => assertFails(addDoc(comentarios('bob'), comentario({ texto: '' }))));
  test('NO: comentario de más de 500 caracteres', () =>
    assertFails(addDoc(comentarios('bob'), comentario({ texto: 'x'.repeat(501) }))));
  test('NO: anónimo', () => assertFails(addDoc(comentarios(null), comentario())));

  test('editar el tuyo (como la web)', async () => {
    await seedComentario();
    await assertSucceeds(updateDoc(c1('bob'), { texto: 'Editado', editadoEn: serverTimestamp() }));
  });
  test('NO: editar cambiando autorNombre', async () => {
    await seedComentario();
    await assertFails(updateDoc(c1('bob'), { texto: 'x', autorNombre: 'Admin', editadoEn: serverTimestamp() }));
  });
  test('NO: editar con editadoEn inventado', async () => {
    await seedComentario();
    await assertFails(updateDoc(c1('bob'), { texto: 'x', editadoEn: Timestamp.fromMillis(0) }));
  });
  test('NO: editar el de otra persona', async () => {
    await seedComentario();
    await assertFails(updateDoc(c1('alice'), { texto: 'x', editadoEn: serverTimestamp() }));
  });
  test('el autor borra su comentario', async () => {
    await seedComentario();
    await assertSucceeds(deleteDoc(c1('bob')));
  });
  test('el dueño del perfil borra un comentario ajeno', async () => {
    await seedComentario();
    await assertSucceeds(deleteDoc(c1('alice')));
  });
  test('NO: un tercero borra el comentario', async () => {
    await seedComentario();
    await assertFails(deleteDoc(c1('carol')));
  });
});

describe('crónica', () => {
  const cronica = (uid) => collection(db(uid), 'cronica');
  const entrada = (extra = {}) => ({
    titulo: 'La caída de la torre',
    texto: 'Ardió entera',
    imagenUrl: null,
    autorUid: 'bob',
    autorNombre: 'Bob',
    creadoEn: serverTimestamp(),
    ...extra,
  });
  const seedEntrada = () => seed('cronica/e1', { ...entrada(), creadoEn: Timestamp.now() });
  const e1 = (uid) => doc(db(uid), 'cronica/e1');

  test('leer sin sesión', async () => {
    await seedEntrada();
    await assertSucceeds(getDoc(e1(null)));
  });
  test('publicar (como la web)', () => assertSucceeds(addDoc(cronica('bob'), entrada())));
  test('publicar con captura', () =>
    assertSucceeds(addDoc(cronica('bob'), entrada({ imagenUrl: 'https://i.imgur.com/x.png' }))));
  test('NO: anónimo', () => assertFails(addDoc(cronica(null), entrada())));
  test('NO: suplantando autorUid', () => assertFails(addDoc(cronica('bob'), entrada({ autorUid: 'alice' }))));
  test('NO: fecha inventada', () =>
    assertFails(addDoc(cronica('bob'), entrada({ creadoEn: Timestamp.fromMillis(0) }))));
  test('NO: campo extra', () => assertFails(addDoc(cronica('bob'), entrada({ fijada: true }))));
  test('NO: sin título', () => assertFails(addDoc(cronica('bob'), entrada({ titulo: '' }))));
  test('NO: título de más de 80 caracteres', () =>
    assertFails(addDoc(cronica('bob'), entrada({ titulo: 'x'.repeat(81) }))));
  test('NO: texto de más de 2000 caracteres', () =>
    assertFails(addDoc(cronica('bob'), entrada({ texto: 'x'.repeat(2001) }))));
  test('NO: imagen javascript:', () =>
    assertFails(addDoc(cronica('bob'), entrada({ imagenUrl: 'javascript:alert(1)' }))));

  test('editar la tuya (como la web)', async () => {
    await seedEntrada();
    await assertSucceeds(
      updateDoc(e1('bob'), { titulo: 'Otra', texto: 'Editado', imagenUrl: null, editadoEn: serverTimestamp() }),
    );
  });
  test('NO: editar cambiando el autor', async () => {
    await seedEntrada();
    await assertFails(updateDoc(e1('bob'), { autorNombre: 'Admin', editadoEn: serverTimestamp() }));
  });
  test('NO: editar la de otra persona', async () => {
    await seedEntrada();
    await assertFails(updateDoc(e1('alice'), { texto: 'x', editadoEn: serverTimestamp() }));
  });
  test('el autor borra su entrada', async () => {
    await seedEntrada();
    await assertSucceeds(deleteDoc(e1('bob')));
  });
  test('NO: otra persona borra la entrada', async () => {
    await seedEntrada();
    await assertFails(deleteDoc(e1('alice')));
  });
});
