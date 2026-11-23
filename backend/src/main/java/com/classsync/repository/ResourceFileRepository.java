package com.classsync.repository;
import com.classsync.entity.ResourceFile; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.EntityGraph; import java.util.*;
public interface ResourceFileRepository extends JpaRepository<ResourceFile,Long>{ @EntityGraph(attributePaths="subject") List<ResourceFile> findAllByOrderByUploadedAtDesc(); @EntityGraph(attributePaths="subject") List<ResourceFile> findBySubjectIdOrderByUploadedAtDesc(Long subjectId); }
