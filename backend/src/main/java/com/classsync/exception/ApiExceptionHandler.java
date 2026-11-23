package com.classsync.exception;
import org.springframework.http.*; import org.springframework.security.core.AuthenticationException; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import java.time.Instant; import java.util.*;
@RestControllerAdvice public class ApiExceptionHandler {
 record ErrorBody(String code,String message,Instant timestamp,Map<String,String> fields){}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException e){var f=new LinkedHashMap<String,String>(); e.getBindingResult().getFieldErrors().forEach(x->f.putIfAbsent(x.getField(),x.getDefaultMessage())); return ResponseEntity.badRequest().body(new ErrorBody("VALIDATION_ERROR","Please correct the highlighted fields",Instant.now(),f));}
 @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<ErrorBody> bad(IllegalArgumentException e){return ResponseEntity.badRequest().body(new ErrorBody("BAD_REQUEST",e.getMessage(),Instant.now(),Map.of()));}
 @ExceptionHandler(NoSuchElementException.class) ResponseEntity<ErrorBody> missing(NoSuchElementException e){return ResponseEntity.status(404).body(new ErrorBody("NOT_FOUND",e.getMessage(),Instant.now(),Map.of()));}
 @ExceptionHandler(AuthenticationException.class) ResponseEntity<ErrorBody> auth(AuthenticationException e){return ResponseEntity.status(401).body(new ErrorBody("INVALID_CREDENTIALS","Invalid class representative email or password",Instant.now(),Map.of()));}
}
