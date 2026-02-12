import { getCollection } from 'astro:content';

export async function getWorksByStudent(studentId: string) {
  const works = await getCollection('works');
  return works.filter(work =>
    work.data.students.some(s => s.id === studentId)
  ).sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
}

export async function getWorksByEvent(eventId: string) {
  const works = await getCollection('works');
  return works.filter(work =>
    work.data.events.some(e => e.id === eventId)
  ).sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
}

export async function getStudentsByEvent(eventId: string) {
  const works = await getWorksByEvent(eventId);
  const studentIds = new Set(works.flatMap(w => w.data.students.map(s => s.id)));
  const students = await getCollection('students');
  return students.filter(s => studentIds.has(s.id));
}

export async function getStudentsByProgram(programId: string) {
  const students = await getCollection('students');
  return students.filter(s => s.data.program.id === programId);
}
