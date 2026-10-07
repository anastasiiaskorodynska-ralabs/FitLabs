-- Bigger exercise library: more equipment to choose from (all unticked —
-- tick what your gym has in Profile → Equipment) and a link from each
-- library exercise to its free-exercise-db source.

insert into equipment (slug, name_en, name_uk, category, position, is_cardio_machine) values
  ('hack-squat',             'Hack squat machine',          'Гак-машина',                         'machines',     50, false),
  ('chest-press-machine',    'Chest press machine',         'Тренажер для жиму від грудей',       'machines',     60, false),
  ('pec-deck',               'Pec deck (butterfly)',        'Батерфляй',                          'machines',     70, false),
  ('shoulder-press-machine', 'Shoulder press machine',      'Тренажер для жиму плечима',          'machines',     80, false),
  ('calf-machine',           'Calf raise machine',          'Тренажер для литок',                 'machines',     90, false),
  ('hip-abductor-adductor',  'Hip abductor / adductor',     'Тренажер для відведення / зведення стегон', 'machines', 100, false),
  ('back-extension',         'Back extension bench',        'Гіперекстензія',                     'machines',    110, false),
  ('dip-station',            'Dip bars',                    'Бруси',                              'accessories',  50, false),
  ('stability-ball',         'Fitball',                     'Фітбол',                             'accessories',  60, false),
  ('medicine-ball',          'Medicine ball',               'Медбол',                             'accessories',  70, false),
  ('ab-wheel',               'Ab wheel',                    'Ролик для преса',                    'accessories',  80, false),
  ('treadmill',              'Treadmill',                   'Бігова доріжка',                     'cardio',       10, true),
  ('elliptical',             'Elliptical',                  'Орбітрек',                           'cardio',       20, true),
  ('exercise-bike',          'Exercise bike',               'Велотренажер',                       'cardio',       30, true),
  ('rowing-machine',         'Rowing machine',              'Гребний тренажер',                   'cardio',       40, true)
on conflict (slug) do nothing;

-- free-exercise-db id the exercise was imported from (photos and updates).
alter table exercises add column source_id text unique;
