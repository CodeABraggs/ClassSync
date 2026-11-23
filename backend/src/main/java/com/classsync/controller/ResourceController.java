package com.classsync.controller;
import com.classsync.entity.ResourceFile; import com.classsync.repository.*; import com.classsync.service.LocalStorageService; import org.springframework.core.io.Resource; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile; import java.io.*; import java.time.Instant; import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import org.springframework.transaction.annotation.Transactional;
@RestController @RequestMapping("/api/resources") public class ResourceController {
 private final ResourceFileRepository repo;
 private final SubjectRepository subjects;
 private final UserRepository users;
 private final LocalStorageService storage;
 private final ResourceFolderRepository folders;

 public ResourceController(ResourceFileRepository repo, SubjectRepository subjects, UserRepository users,
                           LocalStorageService storage, ResourceFolderRepository folders) {
   this.repo = repo;
   this.subjects = subjects;
   this.users = users;
   this.storage = storage;
   this.folders = folders;
 }

 public record View(Long id,String name,String contentType,long size,Long subjectId,String subject,Instant uploadedAt,Long folderId){}
 public record Details(@NotBlank @Size(max = 255) String name, @NotNull Long subjectId, Long folderId) {}
 @GetMapping public List<View> all(@RequestParam(required=false)Long subjectId,@RequestParam(defaultValue="")String q){var list=subjectId==null?repo.findAllByOrderByUploadedAtDesc():repo.findBySubjectIdOrderByUploadedAtDesc(subjectId);String query=q.toLowerCase();return list.stream().filter(x->x.getDisplayName().toLowerCase().contains(query)).map(this::view).toList();}
 @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 @PreAuthorize("hasRole('CR')")
 public View upload(@RequestPart MultipartFile file, @RequestParam Long subjectId,
                    @RequestParam(required=false) Long folderId, Authentication authentication) throws IOException {
   var resource = new ResourceFile();
   assign(resource, subjectId, folderId);
   resource.setDisplayName(Optional.ofNullable(file.getOriginalFilename()).orElse("resource"));
   resource.setContentType(Optional.ofNullable(file.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE));
   resource.setFileSize(file.getSize());
   resource.setUploadedBy(users.findByEmailIgnoreCase(authentication.getName()).orElseThrow());
   resource.setStorageName(storage.store(file));
   try {
     return view(repo.save(resource));
   } catch (RuntimeException error) {
     try {
       storage.delete(resource.getStorageName());
     } catch (IOException cleanupError) {
       error.addSuppressed(cleanupError);
     }
     throw error;
   }
 }
 @PutMapping("/{id}") @PreAuthorize("hasRole('CR')") @Transactional
 public View update(@PathVariable Long id, @Valid @RequestBody Details input) {
   var resource = repo.findById(id).orElseThrow(() -> new NoSuchElementException("Resource not found"));
   String name = input.name().strip();
   if (name.equals(".") || name.equals("..") || name.indexOf('/') >= 0 || name.indexOf('\\') >= 0
       || name.chars().anyMatch(Character::isISOControl)) {
     throw new IllegalArgumentException("Enter a file name without slashes or control characters");
   }
   assign(resource, input.subjectId(), input.folderId());
   resource.setDisplayName(name);
   return view(repo.save(resource));
 }

 private void assign(ResourceFile resource, Long subjectId, Long folderId) {
   var subject = subjects.findById(subjectId).orElseThrow(() -> new NoSuchElementException("Subject not found"));
   if (folderId != null && !folders.existsByIdAndSubjectId(folderId, subjectId)) {
     throw new IllegalArgumentException("Choose a folder in the selected subject");
   }
   resource.setSubject(subject);
   resource.setFolderId(folderId);
 }

 @GetMapping("/{id}/download") public ResponseEntity<Resource> download(@PathVariable Long id){var e=repo.findById(id).orElseThrow(()->new NoSuchElementException("Resource not found"));return ResponseEntity.ok().contentType(MediaType.parseMediaType(e.getContentType())).contentLength(e.getFileSize()).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(e.getDisplayName(),StandardCharsets.UTF_8).build().toString()).body(storage.load(e.getStorageName()));}
 @DeleteMapping("/{id}") @PreAuthorize("hasRole('CR')") public void delete(@PathVariable Long id)throws IOException{var e=repo.findById(id).orElseThrow(()->new NoSuchElementException("Resource not found"));storage.delete(e.getStorageName());repo.delete(e);}
 private View view(ResourceFile e){return new View(e.getId(),e.getDisplayName(),e.getContentType(),e.getFileSize(),e.getSubject().getId(),e.getSubject().getName(),e.getUploadedAt(),e.getFolderId());}
}
