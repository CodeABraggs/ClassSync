package com.classsync.entity;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="calendar_events")
public class CalendarEvent {
 public enum EventType { EXAM, ASSIGNMENT, DEADLINE, HOLIDAY, OTHER }
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String title; @Column(length=10000) private String description;
 @Enumerated(EnumType.STRING) @Column(name="event_type",nullable=false) private EventType eventType;
 @Column(name="start_at",nullable=false) private Instant startAt; @Column(name="end_at",nullable=false) private Instant endAt; private String location;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="subject_id") private Subject subject;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="created_by",nullable=false) private User createdBy;
 @Column(name="created_at",nullable=false) private Instant createdAt; @Column(name="updated_at",nullable=false) private Instant updatedAt;
 @PrePersist void create(){createdAt=updatedAt=Instant.now();} @PreUpdate void update(){updatedAt=Instant.now();}
 public Long getId(){return id;} public String getTitle(){return title;} public void setTitle(String v){title=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;} public EventType getEventType(){return eventType;} public void setEventType(EventType v){eventType=v;} public Instant getStartAt(){return startAt;} public void setStartAt(Instant v){startAt=v;} public Instant getEndAt(){return endAt;} public void setEndAt(Instant v){endAt=v;} public String getLocation(){return location;} public void setLocation(String v){location=v;} public Subject getSubject(){return subject;} public void setSubject(Subject v){subject=v;} public void setCreatedBy(User v){createdBy=v;}
}
