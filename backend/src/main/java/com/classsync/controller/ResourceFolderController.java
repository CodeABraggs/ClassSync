package com.classsync.controller;

import com.classsync.entity.ResourceFolder;
import com.classsync.repository.ResourceFolderRepository;
import com.classsync.repository.SubjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/resource-folders")
public class ResourceFolderController {
    private final ResourceFolderRepository folders;
    private final SubjectRepository subjects;

    public ResourceFolderController(ResourceFolderRepository folders, SubjectRepository subjects) {
        this.folders = folders;
        this.subjects = subjects;
    }

    public record FolderInput(@NotNull Long subjectId, @NotBlank @Size(max = 120) String name) {}

    @GetMapping
    public List<ResourceFolder> all() {
        return folders.findAllByOrderByNameAscIdAsc();
    }

    @PostMapping
    @PreAuthorize("hasRole('CR')")
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceFolder create(@Valid @RequestBody FolderInput input) {
        if (!subjects.existsById(input.subjectId())) {
            throw new NoSuchElementException("Subject not found");
        }
        return folders.save(new ResourceFolder(input.subjectId(), input.name().strip()));
    }
}
