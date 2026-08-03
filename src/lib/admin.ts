export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const envAdmins = (process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
    
  const hardcodedAdmins = [
    'samuelci.spv04@gmail.com', 
    'samuelci6377@gmail.com'
  ];
  
  const allAdmins = [...envAdmins, ...hardcodedAdmins];
  return allAdmins.includes(email.toLowerCase());
}
