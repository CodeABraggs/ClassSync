package com.classsync.controller;
import com.classsync.entity.Subject; import com.classsync.repository.SubjectRepository; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/subjects") public class SubjectController {
 private final SubjectRepository repo; public SubjectController(SubjectRepository r){repo=r;} public record SubjectInput(@NotBlank @Size(max=120) String name,@NotBlank @Size(max=30) String code){}
 @GetMapping public List<Subject> all(){return repo.findAll();}
 @PostMapping @PreAuthorize("hasRole('CR')")
 public Subject create(@Valid @RequestBody SubjectInput input) {
   return save(new Subject(), input);
 }

 @PutMapping("/{id}") @PreAuthorize("hasRole('CR')")
 public Subject update(@PathVariable Long id, @Valid @RequestBody SubjectInput input) {
   return save(repo.findById(id).orElseThrow(() -> new NoSuchElementException("Subject not found")), input);
 }

 private Subject save(Subject subject, SubjectInput input) {
   String code = input.code().strip().toUpperCase(Locale.ROOT);
   boolean duplicate = subject.getId() == null
       ? repo.existsByCodeIgnoreCase(code)
       : repo.existsByCodeIgnoreCaseAndIdNot(code, subject.getId());
   if (duplicate) {
     throw new IllegalArgumentException("Subject code already exists");
   }
   subject.setName(input.name().strip());
   subject.setCode(code);
   return repo.save(subject);
 }
 @DeleteMapping("/{id}") @PreAuthorize("hasRole('CR')") public void delete(@PathVariable Long id){repo.deleteById(id);}
}
