/** The six fabrics of the Weave (plain data — safe to import without three.js). */
export type FabricKind = 'Banarasi' | 'Chanderi' | 'Georgette' | 'Cotton' | 'Bandhani' | 'Leheriya';

export const WEAVE_FABRICS: { kind: FabricKind; base: string; hi: string; line: string }[] = [
  { kind: 'Banarasi', base: '#7A0F24', hi: 'बनारसी', line: 'Zari woven into silk on the ghats of Varanasi.' },
  { kind: 'Chanderi', base: '#E9DFC7', hi: 'चंदेरी', line: 'Light as moonlight, with gold coins scattered through.' },
  { kind: 'Georgette', base: '#B4536B', hi: 'जॉर्जेट', line: 'A fall that follows every step.' },
  { kind: 'Cotton', base: '#22305E', hi: 'कॉटन', line: 'Block-printed, sun-dried, softer every wash.' },
  { kind: 'Bandhani', base: '#A3112A', hi: 'बांधनी', line: 'Ten thousand knots, tied by hand.' },
  { kind: 'Leheriya', base: '#2F7D52', hi: 'लहरिया', line: 'The ripple of a monsoon river, dyed in.' },
];
