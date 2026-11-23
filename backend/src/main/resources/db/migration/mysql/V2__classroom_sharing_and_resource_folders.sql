create table classroom_share (
    id bigint not null primary key,
    token varchar(36)
) engine=InnoDB;
insert into classroom_share (id) values (1);

create table resource_folders (
    id bigint not null auto_increment primary key,
    subject_id bigint not null,
    name varchar(120) not null,
    constraint fk_folder_subject foreign key (subject_id) references subjects(id)
) engine=InnoDB;

alter table resources add column folder_id bigint;
alter table resources add constraint fk_resource_folder foreign key (folder_id) references resource_folders(id);
