package com.classsync.entity;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="announcements")
public class Announcement {
 public enum Priority { NORMAL, IMPORTANT }
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String title; @Column(nullable=false,length=10000) private String content;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private Priority priority;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="subject_id") private Subject subject;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="created_by",nullable=false) private User createdBy;
 @Column(name="created_at",nullable=false) private Instant createdAt; @Column(name="updated_at",nullable=false) private Instant updatedAt;
 @Column(name="publish_at") private Instant publishAt;
 public Instant getPublishAt(){return publishAt;}
 public void setPublishAt(Instant publishAt){this.publishAt=publishAt;}
 @PrePersist void create(){createdAt=updatedAt=Instant.now();} @PreUpdate void update(){updatedAt=Instant.now();}
 public Long getId(){return id;} public String getTitle(){return title;} public void setTitle(String v){title=v;} public String getContent(){return content;} public void setContent(String v){content=v;} public Priority getPriority(){return priority;} public void setPriority(Priority v){priority=v;} public Subject getSubject(){return subject;} public void setSubject(Subject v){subject=v;} public void setCreatedBy(User v){createdBy=v;} public Instant getCreatedAt(){return createdAt;}
}
