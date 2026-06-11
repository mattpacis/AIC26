export const TEAM_SCHOOL = 'Ateneo de Manila University';

export type TeamMember = {
  id: string;
  name: string;
  roleLabel?: string;
  course: string;
  email: string;
  linkedInUrl?: string;
  /** Place JPG in frontend/public/team/ (e.g. matt-pacis.jpg) */
  photoSrc: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'matt-pacis',
    name: 'Matt Pacis',
    roleLabel: 'Project lead',
    course: '4 BS Applied Mathematics in Data Science',
    email: 'ronsil.pacis@student.ateneo.edu',
    linkedInUrl: 'https://www.linkedin.com/in/matt-pacis/',
    photoSrc: '/team/matt-pacis.jpg',
  },
  {
    id: 'dallin-andrada',
    name: 'Dallin Ivan Andrada',
    course: '4 BS Applied Mathematics in Data Science',
    email: 'dallin.andrada@student.ateneo.edu',
    linkedInUrl: 'https://www.linkedin.com/in/dallin-ivan-andrada-6795a4334/',
    photoSrc: '/team/dallin-andrada.jpg',
  },
  {
    id: 'julia-cruz',
    name: 'Julia Isabelle Cruz',
    course: '4 BS Applied Mathematics in Data Science',
    email: 'julia.isabelle.cruz@student.ateneo.edu',
    linkedInUrl: 'https://www.linkedin.com/in/julia-cruz-205940376/',
    photoSrc: '/team/julia-cruz.jpg',
  },
];
