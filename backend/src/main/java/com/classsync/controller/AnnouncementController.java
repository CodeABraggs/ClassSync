package com.classsync.controller;

import com.classsync.entity.Announcement;
import com.classsync.repository.AnnouncementRepository;
import com.classsync.repository.SubjectRepository;
import com.classsync.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
public class AnnouncementController {
    private final AnnouncementRepository announcements;
    private final SubjectRepository subjects;
    private final UserRepository users;

    public AnnouncementController(AnnouncementRepository announcements, SubjectRepository subjects, UserRepository users) {
        this.announcements = announcements;
        this.subjects = subjects;
        this.users = users;
    }

    public record Input(@NotBlank @Size(max = 180) String title, @NotBlank @Size(max = 10000) String content,
                        Announcement.Priority priority, Long subjectId, Instant publishAt) {}

    public record View(Long id, String title, String content, String priority, Long subjectId, String subject,
                       Instant createdAt, Instant publishAt) {}

    @GetMapping("/api/announcements")
    public List<View> published() {
        return announcements.findPublished(Instant.now()).stream().map(this::view).toList();
    }

    @GetMapping("/api/admin/announcements")
    @PreAuthorize("hasRole('CR')")
    public List<View> all() {
        return announcements.findAllByOrderByCreatedAtDesc().stream().map(this::view).toList();
    }

    @PostMapping("/api/announcements")
    @PreAuthorize("hasRole('CR')")
    public View create(@Valid @RequestBody Input input, Authentication authentication) {
        var announcement = new Announcement();
        apply(announcement, input);
        announcement.setCreatedBy(users.findByEmailIgnoreCase(authentication.getName()).orElseThrow());
        return view(announcements.save(announcement));
    }

    @PutMapping("/api/announcements/{id}")
    @PreAuthorize("hasRole('CR')")
    @Transactional
    public View update(@PathVariable Long id, @Valid @RequestBody Input input) {
        var announcement = announcements.findById(id).orElseThrow(() -> new NoSuchElementException("Announcement not found"));
        apply(announcement, input);
        return view(announcements.save(announcement));
    }

    @DeleteMapping("/api/announcements/{id}")
    @PreAuthorize("hasRole('CR')")
    public void delete(@PathVariable Long id) {
        announcements.deleteById(id);
    }

    private void apply(Announcement announcement, Input input) {
        announcement.setTitle(input.title().strip());
        announcement.setContent(input.content().strip());
        announcement.setPriority(input.priority() == null ? Announcement.Priority.NORMAL : input.priority());
        announcement.setSubject(input.subjectId() == null ? null : subjects.findById(input.subjectId())
            .orElseThrow(() -> new NoSuchElementException("Subject not found")));
        announcement.setPublishAt(input.publishAt());
    }

    private View view(Announcement announcement) {
        var subject = announcement.getSubject();
        return new View(announcement.getId(), announcement.getTitle(), announcement.getContent(),
            announcement.getPriority().name(), subject == null ? null : subject.getId(),
            subject == null ? null : subject.getName(), announcement.getCreatedAt(), announcement.getPublishAt());
    }
}
