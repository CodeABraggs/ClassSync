package com.classsync.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "resource_folders")
public class ResourceFolder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(nullable = false, length = 120)
    private String name;

    protected ResourceFolder() {}

    public ResourceFolder(Long subjectId, String name) {
        this.subjectId = subjectId;
        this.name = name;
    }

    public Long getId() { return id; }
    public Long getSubjectId() { return subjectId; }
    public String getName() { return name; }
}
