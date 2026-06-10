const GREETINGS = [
  'Hello',
  'Hi',
  'Welcome back',
  'Good to see you',
  'Hey there',
] as const;

export function randomGreeting(firstName: string) {
  const prefix = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  return `${prefix}, ${firstName}`;
}
