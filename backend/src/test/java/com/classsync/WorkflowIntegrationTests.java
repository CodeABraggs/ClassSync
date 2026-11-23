package com.classsync;

import com.classsync.service.ClassroomSharing;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
  "spring.datasource.url=jdbc:h2:mem:workflow-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE",
  "app.uploads-dir=./target/workflow-uploads",
  "app.bootstrap.email=cr@workflow.test",
  "app.bootstrap.password=CrPassword123!"
})
@AutoConfigureMockMvc
class WorkflowIntegrationTests {
  @Autowired MockMvc mvc;

  @Test
  void crCanPublishAndAnonymousReadersCanBrowseFoldersAndDownload() throws Exception {
    BrowserCsrf browser = csrfToken();
    MockHttpSession crSession = login(browser, "cr@workflow.test", "CrPassword123!");

    mvc.perform(get("/api/subjects")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/subjects").header(ClassroomSharing.HEADER, "invalid")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/admin/classroom-share").with(browser::attach)).andExpect(status().isUnauthorized());
    MvcResult share = mvc.perform(post("/api/admin/classroom-share").session(crSession).with(browser::attach))
      .andExpect(status().isOk()).andReturn();
    String token = com.jayway.jsonpath.JsonPath.read(share.getResponse().getContentAsString(), "$.token");
    mvc.perform(post("/api/admin/classroom-share").session(crSession).with(browser::attach))
      .andExpect(jsonPath("$.token").value(token));

    mvc.perform(get("/api/classroom")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/classroom").header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Computer Science"));
    mvc.perform(put("/api/classroom").header(ClassroomSharing.HEADER, token).with(browser::attach)
        .contentType("application/json").content("{\"name\":\"Blocked\"}"))
      .andExpect(status().isUnauthorized());
    mvc.perform(put("/api/classroom").session(crSession).with(browser::attach)
        .contentType("application/json").content("{\"name\":\"   \"}"))
      .andExpect(status().isBadRequest());
    mvc.perform(put("/api/classroom").session(crSession).with(browser::attach)
        .contentType("application/json").content("{\"name\":\"  Semester Six  \"}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Semester Six"));
    mvc.perform(get("/api/classroom").header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Semester Six"));

    MvcResult subjectResult = mvc.perform(post("/api/subjects").session(crSession).with(browser::attach)
        .contentType("application/json").content("{\"name\":\"Database Systems\",\"code\":\"DBMS\"}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("DBMS")).andReturn();
    String subjectId = com.jayway.jsonpath.JsonPath.read(subjectResult.getResponse().getContentAsString(), "$.id").toString();
    mvc.perform(get("/api/subjects").header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].code").value("DBMS"));

    String folderId = createFolder(browser, crSession, subjectId, "Lecture notes");
    createFolder(browser, crSession, subjectId, "Assignments");
    mvc.perform(get("/api/resource-folders").header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)));

    mvc.perform(post("/api/announcements").session(crSession).with(browser::attach)
        .contentType("application/json")
        .content("{\"title\":\"Internal exam\",\"content\":\"Prepare units 1 and 2\",\"priority\":\"IMPORTANT\",\"subjectId\":" + subjectId + "}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.priority").value("IMPORTANT"));

    MvcResult eventResult = mvc.perform(post("/api/events").session(crSession).with(browser::attach)
        .contentType("application/json")
        .content("{\"title\":\"DBMS exam\",\"description\":\"Units 1 and 2\",\"eventType\":\"EXAM\",\"startAt\":\"2030-01-10T04:30:00Z\",\"endAt\":\"2030-01-10T06:30:00Z\",\"subjectId\":" + subjectId + "}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.eventType").value("EXAM")).andReturn();
    String eventId = com.jayway.jsonpath.JsonPath.read(eventResult.getResponse().getContentAsString(), "$.id").toString();

    MockMultipartFile file = new MockMultipartFile("file", "unit-one.pdf", "application/pdf", "test notes".getBytes());
    MvcResult resourceResult = mvc.perform(multipart("/api/resources").file(file).param("subjectId", subjectId)
        .param("folderId", folderId).session(crSession).with(browser::attach))
      .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("unit-one.pdf"))
      .andExpect(jsonPath("$.folderId").value(Integer.parseInt(folderId))).andReturn();
    String resourceId = com.jayway.jsonpath.JsonPath.read(resourceResult.getResponse().getContentAsString(), "$.id").toString();

    mvc.perform(get("/api/announcements").header(ClassroomSharing.HEADER, token)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    mvc.perform(get("/api/events").header(ClassroomSharing.HEADER, token)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    mvc.perform(get("/api/resources").header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].folderId").value(Integer.parseInt(folderId)));
    mvc.perform(get("/api/resources/{id}/download", resourceId)).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/resources/{id}/download", resourceId).header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(content().bytes("test notes".getBytes()));
    mvc.perform(post("/api/announcements").header(ClassroomSharing.HEADER, token).with(browser::attach)
        .contentType("application/json").content("{\"title\":\"Blocked\",\"content\":\"Blocked\",\"priority\":\"NORMAL\"}"))
      .andExpect(status().isUnauthorized());
    mvc.perform(post("/api/resource-folders").header(ClassroomSharing.HEADER, token).with(browser::attach)
        .contentType("application/json").content("{\"subjectId\":" + subjectId + ",\"name\":\"Blocked\"}"))
      .andExpect(status().isUnauthorized());
    mvc.perform(multipart("/api/resources").file(file).param("subjectId", subjectId)
        .param("folderId", folderId).header(ClassroomSharing.HEADER, token).with(browser::attach))
      .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/auth/me").header(ClassroomSharing.HEADER, token)).andExpect(status().isUnauthorized());

    MvcResult other = mvc.perform(post("/api/subjects").session(crSession).with(browser::attach)
        .contentType("application/json").content("{\"name\":\"Algorithms\",\"code\":\"ALGO\"}"))
      .andExpect(status().isOk()).andReturn();
    String otherId = com.jayway.jsonpath.JsonPath.read(other.getResponse().getContentAsString(), "$.id").toString();
    mvc.perform(multipart("/api/resources").file(file).param("subjectId", otherId)
        .param("folderId", folderId).session(crSession).with(browser::attach))
      .andExpect(status().isBadRequest());

    mvc.perform(put("/api/subjects/{id}", subjectId).session(crSession).with(browser::attach)
        .contentType("application/json").content("""
          {"name":"Databases","code":"DBMS"}
          """))
      .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Databases"));
    mvc.perform(put("/api/subjects/{id}", subjectId).session(crSession).with(browser::attach)
        .contentType("application/json").content("""
          {"name":"Databases","code":" algo "}
          """))
      .andExpect(status().isBadRequest());

    String destination = createFolder(browser, crSession, otherId, "Practice");
    mvc.perform(put("/api/resources/{id}", resourceId).session(crSession).with(browser::attach)
        .contentType("application/json").content("""
          {"name":"review.pdf","subjectId":%s,"folderId":%s}
          """.formatted(otherId, folderId)))
      .andExpect(status().isBadRequest());
    mvc.perform(put("/api/resources/{id}", resourceId).session(crSession).with(browser::attach)
        .contentType("application/json").content("""
          {"name":"review.pdf","subjectId":%s,"folderId":%s}
          """.formatted(otherId, destination)))
      .andExpect(status().isOk()).andExpect(jsonPath("$.folderId").value(Integer.parseInt(destination)));
    mvc.perform(get("/api/resources").header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].subject").value("Algorithms"))
      .andExpect(jsonPath("$[0].name").value("review.pdf"));
    mvc.perform(get("/api/resources/{id}/download", resourceId).header(ClassroomSharing.HEADER, token))
      .andExpect(status().isOk()).andExpect(content().bytes("test notes".getBytes()));

    mvc.perform(put("/api/events/{id}", eventId).session(crSession).with(browser::attach)
        .contentType("application/json").content("""
          {"title":"Rescheduled exam","eventType":"EXAM","description":"Bring a calculator",
           "startAt":"2030-01-11T04:30:00Z","endAt":"2030-01-11T06:30:00Z","location":"Room 2","subjectId":%s}
          """.formatted(otherId)))
      .andExpect(status().isOk()).andExpect(jsonPath("$.startAt").value("2030-01-11T04:30:00Z"));
    mvc.perform(get("/api/events").header(ClassroomSharing.HEADER, token))
      .andExpect(jsonPath("$[0].title").value("Rescheduled exam")).andExpect(jsonPath("$[0].location").value("Room 2"))
      .andExpect(jsonPath("$[0].subject").value("Algorithms"));
  }

  @Test
  void scheduledAnnouncementsStayPrivateUntilTheirPublicationTime() throws Exception {
    BrowserCsrf browser = csrfToken();
    MockHttpSession crSession = login(browser, "cr@workflow.test", "CrPassword123!");
    MvcResult share = mvc.perform(post("/api/admin/classroom-share").session(crSession).with(browser::attach))
      .andExpect(status().isOk()).andReturn();
    String token = com.jayway.jsonpath.JsonPath.read(share.getResponse().getContentAsString(), "$.token");
    MvcResult result = mvc.perform(post("/api/announcements").session(crSession).with(browser::attach)
        .contentType("application/json").content("""
          {"title":"Scheduled update","content":"Future class news","publishAt":"2099-01-01T09:00:00Z"}
          """))
      .andExpect(status().isOk()).andExpect(jsonPath("$.publishAt").value("2099-01-01T09:00:00Z")).andReturn();
    String id = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.id").toString();
    try {
      mvc.perform(get("/api/announcements").header(ClassroomSharing.HEADER, token))
        .andExpect(jsonPath("$[?(@.title == 'Scheduled update')]").isEmpty());
      mvc.perform(get("/api/admin/announcements").header(ClassroomSharing.HEADER, token))
        .andExpect(status().isUnauthorized());
      mvc.perform(get("/api/admin/announcements").session(crSession))
        .andExpect(jsonPath("$[?(@.title == 'Scheduled update')]", hasSize(1)));
      mvc.perform(put("/api/announcements/{id}", id).session(crSession).with(browser::attach)
          .contentType("application/json").content("""
            {"title":"Published update","content":"Edited class news","publishAt":"2020-01-01T09:00:00Z"}
            """))
        .andExpect(status().isOk());
      mvc.perform(get("/api/announcements").header(ClassroomSharing.HEADER, token))
        .andExpect(jsonPath("$[?(@.title == 'Published update')].content", hasItem("Edited class news")));
    } finally {
      mvc.perform(delete("/api/announcements/{id}", id).session(crSession).with(browser::attach))
        .andExpect(status().isOk());
    }
  }

  private String createFolder(BrowserCsrf browser, MockHttpSession session, String subjectId, String name) throws Exception {
    MvcResult result = mvc.perform(post("/api/resource-folders").session(session).with(browser::attach)
        .contentType("application/json").content("{\"subjectId\":" + subjectId + ",\"name\":\"" + name + "\"}"))
      .andExpect(status().isCreated()).andReturn();
    return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.id").toString();
  }

  private BrowserCsrf csrfToken() throws Exception {
    MvcResult result = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andExpect(cookie().exists("XSRF-TOKEN")).andReturn();
    String token = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    return new BrowserCsrf(result.getResponse().getCookie("XSRF-TOKEN"), token);
  }

  private MockHttpSession login(BrowserCsrf csrf, String email, String password) throws Exception {
    MvcResult result = mvc.perform(post("/api/auth/login").cookie(csrf.cookie()).header("X-XSRF-TOKEN", csrf.token())
        .contentType("application/json").content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
      .andExpect(status().isOk()).andReturn();
    return (MockHttpSession) result.getRequest().getSession(false);
  }

  private record BrowserCsrf(Cookie cookie, String token) {
    MockHttpServletRequest attach(MockHttpServletRequest request) {
      request.setCookies(cookie);
      request.addHeader("X-XSRF-TOKEN", token);
      return request;
    }
  }
}
