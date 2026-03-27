-- Trading Cards Stats Migration
-- Run this in the Supabase SQL editor AFTER trading_cards_migration.sql

ALTER TABLE trading_cards
  ADD COLUMN overall   INT NOT NULL DEFAULT 0,
  ADD COLUMN pace      INT NOT NULL DEFAULT 0,
  ADD COLUMN shooting  INT NOT NULL DEFAULT 0,
  ADD COLUMN passing   INT NOT NULL DEFAULT 0,
  ADD COLUMN dribbling INT NOT NULL DEFAULT 0,
  ADD COLUMN defending INT NOT NULL DEFAULT 0,
  ADD COLUMN physical  INT NOT NULL DEFAULT 0;

-- Update stats for all 110 players
-- Columns: overall, pace, shooting, passing, dribbling, defending, physical

-- LEGENDARY (10)
UPDATE trading_cards SET overall=93, pace=87, shooting=95, passing=91, dribbling=99, defending=38, physical=65 WHERE id='messi_argentina';
UPDATE trading_cards SET overall=92, pace=89, shooting=95, passing=79, dribbling=89, defending=35, physical=90 WHERE id='ronaldo_portugal';
UPDATE trading_cards SET overall=93, pace=90, shooting=95, passing=88, dribbling=96, defending=44, physical=78 WHERE id='pele_brazil';
UPDATE trading_cards SET overall=91, pace=85, shooting=88, passing=88, dribbling=99, defending=40, physical=72 WHERE id='maradona_argentina';
UPDATE trading_cards SET overall=87, pace=74, shooting=80, passing=92, dribbling=95, defending=68, physical=76 WHERE id='zidane_france';
UPDATE trading_cards SET overall=92, pace=96, shooting=95, passing=74, dribbling=98, defending=26, physical=82 WHERE id='ronaldo_r9_brazil';
UPDATE trading_cards SET overall=86, pace=85, shooting=87, passing=88, dribbling=98, defending=50, physical=68 WHERE id='ronaldinho_brazil';
UPDATE trading_cards SET overall=89, pace=85, shooting=87, passing=90, dribbling=94, defending=60, physical=72 WHERE id='cruyff_netherlands';
UPDATE trading_cards SET overall=87, pace=72, shooting=55, passing=82, dribbling=78, defending=96, physical=80 WHERE id='beckenbauer_germany';
UPDATE trading_cards SET overall=90, pace=88, shooting=97, passing=78, dribbling=88, defending=34, physical=82 WHERE id='van_basten_netherlands';

-- EPIC (25)
UPDATE trading_cards SET overall=90, pace=99, shooting=89, passing=80, dribbling=92, defending=38, physical=77 WHERE id='mbappe_france';
UPDATE trading_cards SET overall=88, pace=89, shooting=94, passing=64, dribbling=80, defending=44, physical=88 WHERE id='haaland_norway';
UPDATE trading_cards SET overall=87, pace=90, shooting=85, passing=84, dribbling=96, defending=36, physical=67 WHERE id='neymar_brazil';
UPDATE trading_cards SET overall=87, pace=95, shooting=90, passing=78, dribbling=88, defending=44, physical=76 WHERE id='henry_france';
UPDATE trading_cards SET overall=83, pace=72, shooting=72, passing=97, dribbling=86, defending=76, physical=68 WHERE id='xavi_spain';
UPDATE trading_cards SET overall=83, pace=78, shooting=74, passing=92, dribbling=94, defending=68, physical=64 WHERE id='iniesta_spain';
UPDATE trading_cards SET overall=82, pace=76, shooting=76, passing=91, dribbling=89, defending=76, physical=66 WHERE id='modric_croatia';
UPDATE trading_cards SET overall=88, pace=80, shooting=48, passing=74, dribbling=72, defending=97, physical=85 WHERE id='maldini_italy';
UPDATE trading_cards SET overall=88, pace=72, shooting=15, passing=56, dribbling=22, defending=94, physical=80 WHERE id='buffon_italy';
UPDATE trading_cards SET overall=86, pace=97, shooting=83, passing=76, dribbling=93, defending=30, physical=68 WHERE id='vinicius_brazil';
UPDATE trading_cards SET overall=84, pace=82, shooting=80, passing=84, dribbling=86, defending=74, physical=82 WHERE id='bellingham_england';
UPDATE trading_cards SET overall=85, pace=79, shooting=88, passing=81, dribbling=87, defending=42, physical=78 WHERE id='benzema_france';
UPDATE trading_cards SET overall=84, pace=82, shooting=89, passing=68, dribbling=80, defending=40, physical=92 WHERE id='drogba_ivorycoast';
UPDATE trading_cards SET overall=85, pace=77, shooting=90, passing=76, dribbling=88, defending=38, physical=88 WHERE id='ibrahimovic_sweden';
UPDATE trading_cards SET overall=84, pace=78, shooting=96, passing=70, dribbling=82, defending=35, physical=80 WHERE id='muller_gerd_germany';
UPDATE trading_cards SET overall=85, pace=90, shooting=92, passing=74, dribbling=88, defending=36, physical=74 WHERE id='eusebio_portugal';
UPDATE trading_cards SET overall=83, pace=84, shooting=82, passing=78, dribbling=96, defending=40, physical=68 WHERE id='best_greatbritain';
UPDATE trading_cards SET overall=83, pace=80, shooting=88, passing=80, dribbling=92, defending=36, physical=70 WHERE id='rivaldo_brazil';
UPDATE trading_cards SET overall=83, pace=80, shooting=87, passing=84, dribbling=92, defending=36, physical=66 WHERE id='baggio_italy';
UPDATE trading_cards SET overall=82, pace=80, shooting=93, passing=68, dribbling=78, defending=36, physical=80 WHERE id='van_nistelrooy_neth';
UPDATE trading_cards SET overall=80, pace=78, shooting=85, passing=78, dribbling=82, defending=40, physical=70 WHERE id='raul_spain';
UPDATE trading_cards SET overall=80, pace=82, shooting=82, passing=86, dribbling=88, defending=60, physical=68 WHERE id='foden_england';
UPDATE trading_cards SET overall=88, pace=95, shooting=88, passing=80, dribbling=90, defending=42, physical=74 WHERE id='salah_egypt';
UPDATE trading_cards SET overall=85, pace=76, shooting=85, passing=95, dribbling=86, defending=64, physical=76 WHERE id='debruyne_belgium';
UPDATE trading_cards SET overall=79, pace=78, shooting=76, passing=88, dribbling=90, defending=68, physical=62 WHERE id='pedri_spain';

-- RARE (40)
UPDATE trading_cards SET overall=83, pace=80, shooting=92, passing=72, dribbling=82, defending=42, physical=82 WHERE id='lewandowski_poland';
UPDATE trading_cards SET overall=84, pace=80, shooting=62, passing=71, dribbling=72, defending=95, physical=92 WHERE id='van_dijk_netherlands';
UPDATE trading_cards SET overall=83, pace=78, shooting=65, passing=72, dribbling=74, defending=93, physical=88 WHERE id='ramos_spain';
UPDATE trading_cards SET overall=80, pace=90, shooting=72, passing=72, dribbling=80, defending=82, physical=82 WHERE id='carlos_brazil';
UPDATE trading_cards SET overall=82, pace=68, shooting=12, passing=52, dribbling=18, defending=90, physical=76 WHERE id='casillas_spain';
UPDATE trading_cards SET overall=85, pace=78, shooting=14, passing=62, dribbling=30, defending=93, physical=82 WHERE id='neuer_germany';
UPDATE trading_cards SET overall=81, pace=80, shooting=80, passing=84, dribbling=80, defending=78, physical=84 WHERE id='gerrard_england';
UPDATE trading_cards SET overall=78, pace=75, shooting=72, passing=93, dribbling=76, defending=58, physical=72 WHERE id='beckham_england';
UPDATE trading_cards SET overall=79, pace=72, shooting=87, passing=82, dribbling=74, defending=74, physical=76 WHERE id='lampard_england';
UPDATE trading_cards SET overall=79, pace=78, shooting=70, passing=78, dribbling=76, defending=84, physical=90 WHERE id='vieira_france';
UPDATE trading_cards SET overall=78, pace=64, shooting=74, passing=96, dribbling=78, defending=72, physical=62 WHERE id='pirlo_italy';
UPDATE trading_cards SET overall=79, pace=68, shooting=78, passing=96, dribbling=80, defending=70, physical=68 WHERE id='kroos_germany';
UPDATE trading_cards SET overall=76, pace=64, shooting=60, passing=88, dribbling=76, defending=88, physical=68 WHERE id='busquets_spain';
UPDATE trading_cards SET overall=80, pace=82, shooting=78, passing=88, dribbling=90, defending=62, physical=70 WHERE id='figo_portugal';
UPDATE trading_cards SET overall=79, pace=74, shooting=80, passing=80, dribbling=76, defending=78, physical=86 WHERE id='ballack_germany';
UPDATE trading_cards SET overall=77, pace=88, shooting=62, passing=72, dribbling=78, defending=82, physical=80 WHERE id='cafu_brazil';
UPDATE trading_cards SET overall=79, pace=78, shooting=44, passing=64, dribbling=66, defending=93, physical=84 WHERE id='cannavaro_italy';
UPDATE trading_cards SET overall=78, pace=74, shooting=42, passing=62, dribbling=62, defending=91, physical=90 WHERE id='puyol_spain';
UPDATE trading_cards SET overall=84, pace=66, shooting=14, passing=52, dribbling=20, defending=93, physical=84 WHERE id='kahn_germany';
UPDATE trading_cards SET overall=84, pace=68, shooting=14, passing=50, dribbling=22, defending=92, physical=84 WHERE id='schmeichel_denmark';
UPDATE trading_cards SET overall=78, pace=88, shooting=70, passing=82, dribbling=82, defending=78, physical=76 WHERE id='dani_alves_brazil';
UPDATE trading_cards SET overall=75, pace=86, shooting=66, passing=80, dribbling=84, defending=72, physical=72 WHERE id='marcelo_brazil';
UPDATE trading_cards SET overall=78, pace=72, shooting=44, passing=56, dribbling=56, defending=90, physical=92 WHERE id='vidic_serbia';
UPDATE trading_cards SET overall=83, pace=94, shooting=84, passing=76, dribbling=88, defending=44, physical=72 WHERE id='mane_senegal';
UPDATE trading_cards SET overall=81, pace=84, shooting=84, passing=78, dribbling=84, defending=50, physical=72 WHERE id='griezmann_france';
UPDATE trading_cards SET overall=81, pace=88, shooting=82, passing=82, dribbling=93, defending=44, physical=66 WHERE id='hazard_belgium';
UPDATE trading_cards SET overall=79, pace=80, shooting=76, passing=82, dribbling=82, defending=72, physical=86 WHERE id='pogba_france';
UPDATE trading_cards SET overall=75, pace=72, shooting=70, passing=92, dribbling=84, defending=52, physical=62 WHERE id='ozil_germany';
UPDATE trading_cards SET overall=82, pace=93, shooting=84, passing=74, dribbling=82, defending=42, physical=80 WHERE id='bale_wales';
UPDATE trading_cards SET overall=80, pace=84, shooting=88, passing=74, dribbling=82, defending=40, physical=72 WHERE id='villa_spain';
UPDATE trading_cards SET overall=79, pace=90, shooting=84, passing=68, dribbling=80, defending=36, physical=72 WHERE id='torres_spain';
UPDATE trading_cards SET overall=80, pace=88, shooting=86, passing=64, dribbling=74, defending=34, physical=92 WHERE id='lukaku_belgium';
UPDATE trading_cards SET overall=76, pace=72, shooting=72, passing=93, dribbling=80, defending=62, physical=64 WHERE id='fabregas_spain';
UPDATE trading_cards SET overall=78, pace=78, shooting=42, passing=70, dribbling=66, defending=90, physical=80 WHERE id='rio_ferdinand_england';
UPDATE trading_cards SET overall=78, pace=86, shooting=54, passing=70, dribbling=74, defending=86, physical=78 WHERE id='ashley_cole_england';
UPDATE trading_cards SET overall=82, pace=90, shooting=90, passing=70, dribbling=80, defending=36, physical=74 WHERE id='shevchenko_ukraine';
UPDATE trading_cards SET overall=80, pace=74, shooting=86, passing=84, dribbling=88, defending=44, physical=70 WHERE id='totti_italy';
UPDATE trading_cards SET overall=80, pace=82, shooting=90, passing=64, dribbling=78, defending=34, physical=90 WHERE id='adriano_brazil';
UPDATE trading_cards SET overall=80, pace=82, shooting=85, passing=78, dribbling=82, defending=44, physical=82 WHERE id='rooney_england';
UPDATE trading_cards SET overall=82, pace=86, shooting=88, passing=80, dribbling=86, defending=42, physical=74 WHERE id='suarez_uruguay';

-- COMMON (35)
UPDATE trading_cards SET overall=79, pace=72, shooting=90, passing=78, dribbling=78, defending=44, physical=82 WHERE id='kane_england';
UPDATE trading_cards SET overall=77, pace=68, shooting=80, passing=88, dribbling=76, defending=72, physical=72 WHERE id='scholes_england';
UPDATE trading_cards SET overall=76, pace=70, shooting=46, passing=62, dribbling=60, defending=90, physical=88 WHERE id='terry_england';
UPDATE trading_cards SET overall=79, pace=66, shooting=14, passing=48, dribbling=18, defending=91, physical=76 WHERE id='banks_england';
UPDATE trading_cards SET overall=84, pace=72, shooting=12, passing=58, dribbling=22, defending=93, physical=82 WHERE id='oblak_slovenia';
UPDATE trading_cards SET overall=76, pace=76, shooting=82, passing=82, dribbling=74, defending=50, physical=72 WHERE id='muller_thomas_germany';
UPDATE trading_cards SET overall=74, pace=72, shooting=86, passing=68, dribbling=68, defending=40, physical=76 WHERE id='klose_germany';
UPDATE trading_cards SET overall=76, pace=72, shooting=72, passing=82, dribbling=76, defending=76, physical=80 WHERE id='schweinsteiger_germany';
UPDATE trading_cards SET overall=78, pace=92, shooting=82, passing=72, dribbling=88, defending=34, physical=68 WHERE id='robben_netherlands';
UPDATE trading_cards SET overall=75, pace=72, shooting=80, passing=88, dribbling=78, defending=60, physical=68 WHERE id='sneijder_netherlands';
UPDATE trading_cards SET overall=75, pace=74, shooting=74, passing=82, dribbling=80, defending=70, physical=74 WHERE id='seedorf_netherlands';
UPDATE trading_cards SET overall=78, pace=80, shooting=80, passing=78, dribbling=86, defending=44, physical=80 WHERE id='gullit_netherlands';
UPDATE trading_cards SET overall=76, pace=82, shooting=84, passing=70, dribbling=80, defending=38, physical=74 WHERE id='kluivert_netherlands';
UPDATE trading_cards SET overall=73, pace=68, shooting=60, passing=78, dribbling=68, defending=84, physical=78 WHERE id='deschamps_france';
UPDATE trading_cards SET overall=73, pace=82, shooting=44, passing=66, dribbling=66, defending=86, physical=82 WHERE id='thuram_france';
UPDATE trading_cards SET overall=74, pace=76, shooting=40, passing=60, dribbling=60, defending=88, physical=86 WHERE id='desailly_france';
UPDATE trading_cards SET overall=74, pace=72, shooting=44, passing=66, dribbling=64, defending=88, physical=82 WHERE id='blanc_france';
UPDATE trading_cards SET overall=72, pace=82, shooting=50, passing=68, dribbling=68, defending=82, physical=78 WHERE id='evra_france';
UPDATE trading_cards SET overall=74, pace=64, shooting=12, passing=48, dribbling=18, defending=84, physical=78 WHERE id='hart_england';
UPDATE trading_cards SET overall=75, pace=60, shooting=12, passing=46, dribbling=16, defending=86, physical=76 WHERE id='seaman_england';
UPDATE trading_cards SET overall=71, pace=76, shooting=46, passing=68, dribbling=64, defending=84, physical=72 WHERE id='neville_england';
UPDATE trading_cards SET overall=74, pace=74, shooting=46, passing=58, dribbling=56, defending=88, physical=86 WHERE id='campbell_england';
UPDATE trading_cards SET overall=74, pace=76, shooting=86, passing=70, dribbling=78, defending=36, physical=68 WHERE id='fowler_england';
UPDATE trading_cards SET overall=71, pace=84, shooting=68, passing=76, dribbling=82, defending=50, physical=64 WHERE id='mcmanaman_england';
UPDATE trading_cards SET overall=69, pace=76, shooting=74, passing=70, dribbling=70, defending=56, physical=76 WHERE id='kuyt_netherlands';
UPDATE trading_cards SET overall=70, pace=56, shooting=40, passing=60, dribbling=52, defending=84, physical=84 WHERE id='mertesacker_germany';
UPDATE trading_cards SET overall=75, pace=82, shooting=80, passing=72, dribbling=82, defending=42, physical=78 WHERE id='tevez_argentina';
UPDATE trading_cards SET overall=74, pace=94, shooting=82, passing=66, dribbling=78, defending=36, physical=60 WHERE id='owen_england';
UPDATE trading_cards SET overall=76, pace=74, shooting=90, passing=68, dribbling=72, defending=40, physical=82 WHERE id='shearer_england';
UPDATE trading_cards SET overall=73, pace=64, shooting=12, passing=52, dribbling=20, defending=83, physical=74 WHERE id='valdes_spain';
UPDATE trading_cards SET overall=73, pace=62, shooting=12, passing=54, dribbling=20, defending=83, physical=76 WHERE id='reina_spain';
UPDATE trading_cards SET overall=73, pace=80, shooting=74, passing=82, dribbling=82, defending=52, physical=64 WHERE id='pires_france';
UPDATE trading_cards SET overall=76, pace=72, shooting=82, passing=82, dribbling=88, defending=40, physical=66 WHERE id='bergkamp_netherlands';
UPDATE trading_cards SET overall=65, pace=80, shooting=68, passing=62, dribbling=66, defending=40, physical=88 WHERE id='heskey_england';
UPDATE trading_cards SET overall=71, pace=72, shooting=60, passing=62, dribbling=58, defending=86, physical=82 WHERE id='pearce_england';
