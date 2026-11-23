package com.classsync.controller;

import com.classsync.service.ClassroomSharing;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ClassroomShareController {
    private final ClassroomSharing sharing;

    public ClassroomShareController(ClassroomSharing sharing) {
        this.sharing = sharing;
    }

    public record ShareLink(String token) {}
    public record Classroom(String name) {}
    public record RenameInput(@NotBlank @Size(max = 120) String name) {}

    @GetMapping("/api/classroom")
    public Classroom classroom() {
        return new Classroom(sharing.getClassroomName());
    }

    @PutMapping("/api/classroom")
    public Classroom rename(@Valid @RequestBody RenameInput input) {
        return new Classroom(sharing.renameClassroom(input.name()));
    }

    @PostMapping("/api/admin/classroom-share")
    public ShareLink share() {
        return new ShareLink(sharing.createOrGetToken());
    }
}
