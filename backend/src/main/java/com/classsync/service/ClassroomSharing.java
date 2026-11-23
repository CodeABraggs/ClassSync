package com.classsync.service;

import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class ClassroomSharing {
    public static final String HEADER = "X-Classroom-Link";
    private static final Pattern TOKEN = Pattern.compile("[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}");

    private final JdbcClient jdbc;

    public ClassroomSharing(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public String createOrGetToken() {
        jdbc.sql("update classroom_share set token = ? where id = 1 and token is null")
            .param(UUID.randomUUID().toString()).update();
        return jdbc.sql("select token from classroom_share where id = 1")
            .query(String.class).single();
    }

    public String getClassroomName() {
        return jdbc.sql("select classroom_name from classroom_share where id = 1")
            .query(String.class).single();
    }

    public String renameClassroom(String name) {
        String trimmed = name.strip();
        jdbc.sql("update classroom_share set classroom_name = ? where id = 1")
            .param(trimmed).update();
        return trimmed;
    }

    public boolean isValid(String token) {
        if (token == null || !TOKEN.matcher(token).matches()) {
            return false;
        }
        return jdbc.sql("select token from classroom_share where id = 1 and token = ?")
            .param(token).query(String.class).optional().isPresent();
    }
}
