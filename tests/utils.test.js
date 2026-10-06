import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExpiringImageUrl } from '../js/utils.js';

test('isExpiringImageUrl detecta los links de Discord, que caducan', () => {
  assert.ok(isExpiringImageUrl('https://cdn.discordapp.com/attachments/1/2/pj.png?ex=abc&is=def&hm=123'));
  assert.ok(isExpiringImageUrl('https://media.discordapp.net/attachments/1/2/pj.png'));
  assert.ok(isExpiringImageUrl('https://images-ext-1.discordapp.net/external/x/pj.png'));
});

test('isExpiringImageUrl deja pasar los demás links y lo que no es una URL', () => {
  assert.equal(isExpiringImageUrl('https://i.pinimg.com/736x/aa/bb/pj.jpg'), false);
  assert.equal(isExpiringImageUrl('https://i.imgur.com/pj.png'), false);
  assert.equal(isExpiringImageUrl('https://res.cloudinary.com/demo/image/upload/pj.png'), false);
  assert.equal(isExpiringImageUrl('https://falsodiscordapp.com/pj.png'), false);
  assert.equal(isExpiringImageUrl(''), false);
  assert.equal(isExpiringImageUrl('no es un link'), false);
});
