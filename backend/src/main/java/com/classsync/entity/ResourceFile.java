package com.classsync.entity;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="resources")
public class ResourceFile {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="folder_id") private Long folderId;
 public Long getFolderId(){return folderId;}
 public void setFolderId(Long folderId){this.folderId=folderId;}
 @Column(name="display_name",nullable=false) private String displayName; @Column(name="storage_name",nullable=false,unique=true) private String storageName; @Column(name="content_type",nullable=false) private String contentType; @Column(name="file_size",nullable=false) private long fileSize;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="subject_id",nullable=false) private Subject subject; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="uploaded_by",nullable=false) private User uploadedBy; @Column(name="uploaded_at",nullable=false) private Instant uploadedAt;
 @PrePersist void create(){uploadedAt=Instant.now();}
 public Long getId(){return id;} public String getDisplayName(){return displayName;} public void setDisplayName(String v){displayName=v;} public String getStorageName(){return storageName;} public void setStorageName(String v){storageName=v;} public String getContentType(){return contentType;} public void setContentType(String v){contentType=v;} public long getFileSize(){return fileSize;} public void setFileSize(long v){fileSize=v;} public Subject getSubject(){return subject;} public void setSubject(Subject v){subject=v;} public void setUploadedBy(User v){uploadedBy=v;} public Instant getUploadedAt(){return uploadedAt;}
}
