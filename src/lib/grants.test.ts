import { expect, test } from 'bun:test';
import { getFundedProjects } from './grants';

const respond = (body: unknown, status = 200) =>
  (async () => Response.json(body, { status })) as typeof fetch;

test('uses only the selected funded projects with valid names, authors, and descriptions', async () => {
  const project = { id: 'beacons', name: 'Beacons', authors: [{ name: 'Jack Hogan' }], description: 'Social devices.' };
  expect(await getFundedProjects(respond([
    { ...project, id: 'unselected' }, null, project,
    { ...project, id: 'poas', authors: [null, { name: 42 }] },
  ]))).toEqual([{ name: 'Beacons', authors: 'Jack Hogan', description: 'Social devices.' }]);
});

test('omits examples on feed failures without inventing funded projects', async () => {
  expect(await getFundedProjects(respond({ error: 'invalid shape' }))).toEqual([]);
  expect(await getFundedProjects(respond([], 503))).toEqual([]);
  expect(await getFundedProjects((async () => { throw new Error('offline'); }) as typeof fetch)).toEqual([]);
});
