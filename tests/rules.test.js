// Tests de firestore.rules contra el emulador de Firestore.
// Se lanzan con: npm run test:rules (arranca el emulador, pasa esto y lo para).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nova',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const base = () => ({ nombre: 'Alicia', minecraftUsername: null, fotoUrl: null, bloques: [], actualizadoEn: serverTimestamp() });
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
    await assertFails(updateDoc(doc(db('alice'), 'personajes/alice'), { ...base(), creadoEn: Timestamp.fromMillis(0) }));
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
  const seedComentario = () =>
    seed('personajes/alice/comentarios/c1', { ...comentario(), creadoEn: Timestamp.now() });
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
