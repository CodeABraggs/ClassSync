package com.classsync.service;
import org.springframework.beans.factory.annotation.Value; import org.springframework.core.io.*; import org.springframework.stereotype.Service; import org.springframework.web.multipart.MultipartFile; import java.io.*; import java.nio.file.*; import java.util.*;
@Service public class LocalStorageService {
 private final Path root; private static final Set<String> EXT=Set.of("pdf","ppt","pptx","doc","docx");
 public LocalStorageService(@Value("${app.uploads-dir}") String dir) throws IOException{root=Paths.get(dir).toAbsolutePath().normalize();Files.createDirectories(root);}
 public String store(MultipartFile file) throws IOException{if(file.isEmpty())throw new IllegalArgumentException("Choose a non-empty file");String original=Optional.ofNullable(file.getOriginalFilename()).orElse("file");String ext=original.contains(".")?original.substring(original.lastIndexOf('.')+1).toLowerCase():"";if(!EXT.contains(ext))throw new IllegalArgumentException("Only PDF, PPT/PPTX, and DOC/DOCX files are allowed");String name=UUID.randomUUID()+"."+ext;Path target=root.resolve(name).normalize();if(!target.getParent().equals(root))throw new IllegalArgumentException("Invalid file name");try(InputStream in=file.getInputStream()){Files.copy(in,target,StandardCopyOption.REPLACE_EXISTING);}return name;}
 public Resource load(String name){Path p=root.resolve(name).normalize();if(!p.getParent().equals(root)||!Files.exists(p))throw new NoSuchElementException("Stored file not found");return new FileSystemResource(p);}
 public void delete(String name)throws IOException{Path p=root.resolve(name).normalize();if(p.getParent().equals(root))Files.deleteIfExists(p);}
}
