package com.classsync.repository;
import com.classsync.entity.CalendarEvent; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.EntityGraph; import java.time.Instant; import java.util.*;
public interface CalendarEventRepository extends JpaRepository<CalendarEvent,Long>{ @EntityGraph(attributePaths="subject") List<CalendarEvent> findByEndAtGreaterThanEqualOrderByStartAtAsc(Instant from); @EntityGraph(attributePaths="subject") List<CalendarEvent> findAllByOrderByStartAtAsc(); }
