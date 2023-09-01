alter table slide add column insert_between_six_seven tinyint(4) not null default 0 after insert_between_five_six;
alter table slide add column insert_between_seven_eight tinyint(4) not null default 0 after insert_between_six_seven;
alter table slide add column scene_qc_7 tinyint(4) not null default 0 after scene_qc_6;
alter table slide add column scene_qc_8 tinyint(4) not null default 0 after scene_qc_7;