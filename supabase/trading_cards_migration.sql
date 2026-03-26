-- Trading Cards Feature Migration
-- Run this in the Supabase SQL editor

-- 1. Card catalogue (static reference data)
CREATE TABLE trading_cards (
  id                TEXT PRIMARY KEY,
  player_name       TEXT NOT NULL,
  nationality       TEXT NOT NULL,
  flag_emoji        TEXT NOT NULL,
  position          TEXT NOT NULL CHECK (position IN ('FWD','MID','DEF','GK')),
  rarity            TEXT NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  milestone_touches INTEGER NULL
);

-- 2. User-owned cards (one row per card earned; duplicates allowed after full set)
CREATE TABLE user_cards (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id   TEXT NOT NULL REFERENCES trading_cards(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source    TEXT NOT NULL CHECK (source IN ('milestone','drop'))
);

CREATE INDEX user_cards_user_id_idx ON user_cards(user_id);

-- 3. RLS
ALTER TABLE trading_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trading cards" ON trading_cards FOR SELECT USING (true);
CREATE POLICY "Users can read own cards" ON user_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Seed data — 110 players
INSERT INTO trading_cards (id, player_name, nationality, flag_emoji, position, rarity, sort_order, milestone_touches) VALUES
-- LEGENDARY (10)
('messi_argentina',        'Lionel Messi',         'Argentina',        '🇦🇷', 'FWD', 'legendary',  1,  100000),
('ronaldo_portugal',       'Cristiano Ronaldo',    'Portugal',         '🇵🇹', 'FWD', 'legendary',  2,  500000),
('pele_brazil',            'Pelé',                 'Brazil',           '🇧🇷', 'FWD', 'legendary',  3,  1000000),
('maradona_argentina',     'Diego Maradona',       'Argentina',        '🇦🇷', 'FWD', 'legendary',  4,  NULL),
('zidane_france',          'Zinedine Zidane',      'France',           '🇫🇷', 'MID', 'legendary',  5,  NULL),
('ronaldo_r9_brazil',      'Ronaldo (R9)',          'Brazil',           '🇧🇷', 'FWD', 'legendary',  6,  NULL),
('ronaldinho_brazil',      'Ronaldinho',           'Brazil',           '🇧🇷', 'MID', 'legendary',  7,  NULL),
('cruyff_netherlands',     'Johan Cruyff',         'Netherlands',      '🇳🇱', 'FWD', 'legendary',  8,  NULL),
('beckenbauer_germany',    'Franz Beckenbauer',    'Germany',          '🇩🇪', 'DEF', 'legendary',  9,  NULL),
('van_basten_netherlands', 'Marco van Basten',     'Netherlands',      '🇳🇱', 'FWD', 'legendary', 10,  NULL),

-- EPIC (25)
('mbappe_france',          'Kylian Mbappé',        'France',           '🇫🇷', 'FWD', 'epic',      101,  50000),
('haaland_norway',         'Erling Haaland',       'Norway',           '🇳🇴', 'FWD', 'epic',      102,  25000),
('neymar_brazil',          'Neymar Jr.',           'Brazil',           '🇧🇷', 'FWD', 'epic',      103,  250000),
('henry_france',           'Thierry Henry',        'France',           '🇫🇷', 'FWD', 'epic',      104,  NULL),
('xavi_spain',             'Xavi Hernández',       'Spain',            '🇪🇸', 'MID', 'epic',      105,  NULL),
('iniesta_spain',          'Andrés Iniesta',       'Spain',            '🇪🇸', 'MID', 'epic',      106,  NULL),
('modric_croatia',         'Luka Modrić',          'Croatia',          '🇭🇷', 'MID', 'epic',      107,  10000),
('maldini_italy',          'Paolo Maldini',        'Italy',            '🇮🇹', 'DEF', 'epic',      108,  NULL),
('buffon_italy',           'Gianluigi Buffon',     'Italy',            '🇮🇹', 'GK',  'epic',      109,  NULL),
('vinicius_brazil',        'Vinicius Jr.',         'Brazil',           '🇧🇷', 'FWD', 'epic',      110,  NULL),
('bellingham_england',     'Jude Bellingham',      'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 'epic',      111,  NULL),
('benzema_france',         'Karim Benzema',        'France',           '🇫🇷', 'FWD', 'epic',      112,  NULL),
('drogba_ivorycoast',      'Didier Drogba',        'Ivory Coast',      '🇨🇮', 'FWD', 'epic',      113,  NULL),
('ibrahimovic_sweden',     'Zlatan Ibrahimović',   'Sweden',           '🇸🇪', 'FWD', 'epic',      114,  NULL),
('muller_gerd_germany',    'Gerd Müller',          'Germany',          '🇩🇪', 'FWD', 'epic',      115,  NULL),
('eusebio_portugal',       'Eusébio',              'Portugal',         '🇵🇹', 'FWD', 'epic',      116,  NULL),
('best_greatbritain',      'George Best',          'Great Britain',    '🇬🇧', 'FWD', 'epic',      117,  NULL),
('rivaldo_brazil',         'Rivaldo',              'Brazil',           '🇧🇷', 'FWD', 'epic',      118,  NULL),
('baggio_italy',           'Roberto Baggio',       'Italy',            '🇮🇹', 'FWD', 'epic',      119,  NULL),
('van_nistelrooy_neth',    'Ruud van Nistelrooy',  'Netherlands',      '🇳🇱', 'FWD', 'epic',      120,  NULL),
('raul_spain',             'Raúl',                 'Spain',            '🇪🇸', 'FWD', 'epic',      121,  NULL),
('foden_england',          'Phil Foden',           'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 'epic',      122,  NULL),
('salah_egypt',            'Mohamed Salah',        'Egypt',            '🇪🇬', 'FWD', 'epic',      123,  NULL),
('debruyne_belgium',       'Kevin De Bruyne',      'Belgium',          '🇧🇪', 'MID', 'epic',      124,  NULL),
('pedri_spain',            'Pedri',                'Spain',            '🇪🇸', 'MID', 'epic',      125,  NULL),

-- RARE (40)
('lewandowski_poland',     'Robert Lewandowski',   'Poland',           '🇵🇱', 'FWD', 'rare',      201,  NULL),
('van_dijk_netherlands',   'Virgil van Dijk',      'Netherlands',      '🇳🇱', 'DEF', 'rare',      202,  NULL),
('ramos_spain',            'Sergio Ramos',         'Spain',            '🇪🇸', 'DEF', 'rare',      203,  NULL),
('carlos_brazil',          'Roberto Carlos',       'Brazil',           '🇧🇷', 'DEF', 'rare',      204,  NULL),
('casillas_spain',         'Iker Casillas',        'Spain',            '🇪🇸', 'GK',  'rare',      205,  NULL),
('neuer_germany',          'Manuel Neuer',         'Germany',          '🇩🇪', 'GK',  'rare',      206,  NULL),
('gerrard_england',        'Steven Gerrard',       'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 'rare',      207,  5000),
('beckham_england',        'David Beckham',        'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 'rare',      208,  1000),
('lampard_england',        'Frank Lampard',        'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 'rare',      209,  NULL),
('vieira_france',          'Patrick Vieira',       'France',           '🇫🇷', 'MID', 'rare',      210,  NULL),
('pirlo_italy',            'Andrea Pirlo',         'Italy',            '🇮🇹', 'MID', 'rare',      211,  NULL),
('kroos_germany',          'Toni Kroos',           'Germany',          '🇩🇪', 'MID', 'rare',      212,  NULL),
('busquets_spain',         'Sergio Busquets',      'Spain',            '🇪🇸', 'MID', 'rare',      213,  NULL),
('figo_portugal',          'Luís Figo',            'Portugal',         '🇵🇹', 'MID', 'rare',      214,  NULL),
('ballack_germany',        'Michael Ballack',      'Germany',          '🇩🇪', 'MID', 'rare',      215,  NULL),
('cafu_brazil',            'Cafú',                 'Brazil',           '🇧🇷', 'DEF', 'rare',      216,  NULL),
('cannavaro_italy',        'Fabio Cannavaro',      'Italy',            '🇮🇹', 'DEF', 'rare',      217,  NULL),
('puyol_spain',            'Carles Puyol',         'Spain',            '🇪🇸', 'DEF', 'rare',      218,  NULL),
('kahn_germany',           'Oliver Kahn',          'Germany',          '🇩🇪', 'GK',  'rare',      219,  NULL),
('schmeichel_denmark',     'Peter Schmeichel',     'Denmark',          '🇩🇰', 'GK',  'rare',      220,  NULL),
('dani_alves_brazil',      'Dani Alves',           'Brazil',           '🇧🇷', 'DEF', 'rare',      221,  NULL),
('marcelo_brazil',         'Marcelo',              'Brazil',           '🇧🇷', 'DEF', 'rare',      222,  NULL),
('vidic_serbia',           'Nemanja Vidić',        'Serbia',           '🇷🇸', 'DEF', 'rare',      223,  NULL),
('mane_senegal',           'Sadio Mané',           'Senegal',          '🇸🇳', 'FWD', 'rare',      224,  NULL),
('griezmann_france',       'Antoine Griezmann',    'France',           '🇫🇷', 'FWD', 'rare',      225,  NULL),
('hazard_belgium',         'Eden Hazard',          'Belgium',          '🇧🇪', 'MID', 'rare',      226,  NULL),
('pogba_france',           'Paul Pogba',           'France',           '🇫🇷', 'MID', 'rare',      227,  NULL),
('ozil_germany',           'Mesut Özil',           'Germany',          '🇩🇪', 'MID', 'rare',      228,  NULL),
('bale_wales',             'Gareth Bale',          'Wales',            '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'FWD', 'rare',      229,  NULL),
('villa_spain',            'David Villa',          'Spain',            '🇪🇸', 'FWD', 'rare',      230,  NULL),
('torres_spain',           'Fernando Torres',      'Spain',            '🇪🇸', 'FWD', 'rare',      231,  NULL),
('lukaku_belgium',         'Romelu Lukaku',        'Belgium',          '🇧🇪', 'FWD', 'rare',      232,  NULL),
('fabregas_spain',         'Cesc Fàbregas',        'Spain',            '🇪🇸', 'MID', 'rare',      233,  NULL),
('rio_ferdinand_england',  'Rio Ferdinand',        'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 'rare',      234,  NULL),
('ashley_cole_england',    'Ashley Cole',          'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 'rare',      235,  NULL),
('shevchenko_ukraine',     'Andriy Shevchenko',    'Ukraine',          '🇺🇦', 'FWD', 'rare',      236,  NULL),
('totti_italy',            'Francesco Totti',      'Italy',            '🇮🇹', 'FWD', 'rare',      237,  NULL),
('adriano_brazil',         'Adriano',              'Brazil',           '🇧🇷', 'FWD', 'rare',      238,  NULL),
('rooney_england',         'Wayne Rooney',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 'rare',      239,  NULL),
('suarez_uruguay',         'Luis Suárez',          'Uruguay',          '🇺🇾', 'FWD', 'rare',      240,  NULL),

-- COMMON (35)
('kane_england',           'Harry Kane',           'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 'common',    301,  NULL),
('scholes_england',        'Paul Scholes',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 'common',    302,  NULL),
('terry_england',          'John Terry',           'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 'common',    303,  NULL),
('banks_england',          'Gordon Banks',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'GK',  'common',    304,  NULL),
('oblak_slovenia',         'Jan Oblak',            'Slovenia',         '🇸🇮', 'GK',  'common',    305,  NULL),
('muller_thomas_germany',  'Thomas Müller',        'Germany',          '🇩🇪', 'FWD', 'common',    306,  NULL),
('klose_germany',          'Miroslav Klose',       'Germany',          '🇩🇪', 'FWD', 'common',    307,  NULL),
('schweinsteiger_germany', 'Bastian Schweinsteiger','Germany',         '🇩🇪', 'MID', 'common',    308,  NULL),
('robben_netherlands',     'Arjen Robben',         'Netherlands',      '🇳🇱', 'FWD', 'common',    309,  NULL),
('sneijder_netherlands',   'Wesley Sneijder',      'Netherlands',      '🇳🇱', 'MID', 'common',    310,  NULL),
('seedorf_netherlands',    'Clarence Seedorf',     'Netherlands',      '🇳🇱', 'MID', 'common',    311,  NULL),
('gullit_netherlands',     'Ruud Gullit',          'Netherlands',      '🇳🇱', 'FWD', 'common',    312,  NULL),
('kluivert_netherlands',   'Patrick Kluivert',     'Netherlands',      '🇳🇱', 'FWD', 'common',    313,  NULL),
('deschamps_france',       'Didier Deschamps',     'France',           '🇫🇷', 'MID', 'common',    314,  NULL),
('thuram_france',          'Lilian Thuram',        'France',           '🇫🇷', 'DEF', 'common',    315,  NULL),
('desailly_france',        'Marcel Desailly',      'France',           '🇫🇷', 'DEF', 'common',    316,  NULL),
('blanc_france',           'Laurent Blanc',        'France',           '🇫🇷', 'DEF', 'common',    317,  NULL),
('evra_france',            'Patrice Evra',         'France',           '🇫🇷', 'DEF', 'common',    318,  NULL),
('hart_england',           'Joe Hart',             'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'GK',  'common',    319,  NULL),
('seaman_england',         'David Seaman',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'GK',  'common',    320,  NULL),
('neville_england',        'Gary Neville',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 'common',    321,  NULL),
('campbell_england',       'Sol Campbell',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 'common',    322,  NULL),
('fowler_england',         'Robbie Fowler',        'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 'common',    323,  NULL),
('mcmanaman_england',      'Steve McManaman',      'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MID', 'common',    324,  NULL),
('kuyt_netherlands',       'Dirk Kuyt',            'Netherlands',      '🇳🇱', 'FWD', 'common',    325,  NULL),
('mertesacker_germany',    'Per Mertesacker',      'Germany',          '🇩🇪', 'DEF', 'common',    326,  NULL),
('tevez_argentina',        'Carlos Tevez',         'Argentina',        '🇦🇷', 'FWD', 'common',    327,  NULL),
('owen_england',           'Michael Owen',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 'common',    328,  NULL),
('shearer_england',        'Alan Shearer',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 'common',    329,  NULL),
('valdes_spain',           'Victor Valdés',        'Spain',            '🇪🇸', 'GK',  'common',    330,  NULL),
('reina_spain',            'Pepe Reina',           'Spain',            '🇪🇸', 'GK',  'common',    331,  NULL),
('pires_france',           'Robert Pirès',         'France',           '🇫🇷', 'MID', 'common',    332,  NULL),
('bergkamp_netherlands',   'Dennis Bergkamp',      'Netherlands',      '🇳🇱', 'FWD', 'common',    333,  NULL),
('heskey_england',         'Emile Heskey',         'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FWD', 'common',    334,  NULL),
('pearce_england',         'Stuart Pearce',        'England',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 'common',    335,  NULL);
