-- Only three workout types are used: lower, upper and func (functional circuit).
-- Postgres can't drop an enum value in place, so 'full' stays in the day_type
-- enum but existing rows move off it and new rows are rejected.

update sessions set day_type = 'func' where day_type = 'full';
update schedule_days set day_type = 'func' where day_type = 'full';
update examples set day_type = 'func' where day_type = 'full';
update exercises set day_types = array_remove(day_types, 'full') where 'full' = any(day_types);

alter table sessions add constraint sessions_day_type_not_full check (day_type <> 'full');
alter table schedule_days add constraint schedule_days_day_type_not_full check (day_type <> 'full');
alter table examples add constraint examples_day_type_not_full check (day_type <> 'full');
alter table exercises add constraint exercises_day_types_not_full check (not ('full' = any(day_types)));
