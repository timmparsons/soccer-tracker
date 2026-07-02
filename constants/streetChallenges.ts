export interface StreetChallenge {
  id: string;
  name: string;
  description: string;
}

export interface StreetCategory {
  label: string;
  challenges: StreetChallenge[];
}

export const STREET_CHALLENGES: Record<string, StreetCategory> = {
  freestyle: {
    label: 'Freestyle',
    challenges: [
      {
        id: 'seated_samba',
        name: 'The Seated Samba',
        description:
          'Sit flat on the grass or a lawn chair and try to juggle. Without your legs to run or adjust your posture, your ankles have to solve a thousand rapid problems to keep it alive.',
      },
      {
        id: 'maracana_volley',
        name: 'The Maracanã Juggle',
        description:
          'Ditch the soccer ball and grab a tennis ball or a tightly rolled-up pair of socks. See if you can do 10 consecutive juggles.',
      },
      {
        id: 'joga_bonito_chain',
        name: 'Joga Bonito Chain',
        description:
          'Link 5 completely different technical surfaces together into one fluid, unbroken backyard sequence (e.g., laces, thigh, inside, sole roll, heel flick). Name your signature chain.',
      },
    ],
  },
  accuracy: {
    label: 'Accuracy',
    challenges: [
      {
        id: 'yard_sniper',
        name: 'The Yard Sniper',
        description:
          'Set up a single target (a backyard trash can, an open cooler, or a lawn chair) from 15 yards out. Figure out the exact weight and spin needed to chip or drop the ball directly into it.',
      },
      {
        id: 'crossbar_challenge',
        name: 'Crossbar Challenge',
        description:
          'Stand 18 yards out from a frame or a fence target. Try to ping the crossbar or an exact top-corner marker twice in a row.',
      },
      {
        id: 'cross_town_rivalry',
        name: 'The Cross-Town Rivalry',
        description:
          'Set a chair or an obstacle 5 yards out from a wall. Pass the ball firmly past it so the rebound snaps back to you without clipping the obstacle on the way back.',
      },
    ],
  },
  crazy_control: {
    label: 'Crazy Control',
    challenges: [
      {
        id: 'futsal_floor_lock',
        name: 'Futsal Floor Lock',
        description:
          'Smash a firm, ugly pass against a wall. Use ONLY the sole of your shoe to kill the spinning rebound dead under your center of gravity, then instantly roll it sideways.',
      },
      {
        id: 'phone_booth',
        name: 'Kick-ups in a Phone Booth',
        description:
          'Drop two shoes or markers exactly 1 yard apart. You have 60 seconds to manipulate the ball with quick rolls and tight chops without letting it hit your markers or stepping out.',
      },
      {
        id: 'roof_trap',
        name: 'The Roof Trap',
        description:
          'Launch the ball high onto a roof slope or way up into the sky. Track it as it falls and use a soft touch to dead-stop the ball right on your laces.',
      },
    ],
  },
  make_rules: {
    label: 'Make Your Own Rules',
    challenges: [
      {
        id: 'chaos_minutes',
        name: '3 Minutes of Chaos',
        description:
          'Pure street soccer, no rules. Move around your yard, test your limits, and try to invent a combination or transition that feels completely fluid.',
      },
      {
        id: 'marauder',
        name: 'The Marauder',
        description:
          'Spend 3 full minutes juggling or testing skills using ONLY your non-dominant foot. Your strong leg is completely locked out—even to save a mistake.',
      },
    ],
  },
  creativity: {
    label: 'Creativity',
    challenges: [
      {
        id: 'favela_toe_poke',
        name: 'The Favela Toe-Poke',
        description:
          'Dribble at a brick wall at top speed. Without slowing down or taking a textbook setup touch, snap a lightning-fast toe-poke shot off the bricks and react to the rebound.',
      },
    ],
  },
};
