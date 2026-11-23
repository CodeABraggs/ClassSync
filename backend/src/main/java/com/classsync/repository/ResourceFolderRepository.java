package com.classsync.repository;

import com.classsync.entity.ResourceFolder;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceFolderRepository extends JpaRepository<ResourceFolder, Long> {
    List<ResourceFolder> findAllByOrderByNameAscIdAsc();
    boolean existsByIdAndSubjectId(Long id, Long subjectId);
}
