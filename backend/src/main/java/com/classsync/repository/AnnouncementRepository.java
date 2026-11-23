package com.classsync.repository;

import com.classsync.entity.Announcement;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    @EntityGraph(attributePaths = "subject")
    @Query("""
        select a from Announcement a
        where a.publishAt is null or a.publishAt <= :now
        order by coalesce(a.publishAt, a.createdAt) desc, a.id desc
        """)
    List<Announcement> findPublished(@Param("now") Instant now);

    @EntityGraph(attributePaths = "subject")
    List<Announcement> findAllByOrderByCreatedAtDesc();
}
