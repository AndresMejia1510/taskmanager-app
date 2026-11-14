package com.taskmanager.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskmanager.backend.repository.TaskRepository;
import com.taskmanager.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@SpringBootTest
@TestPropertySource(properties = {
	    "spring.datasource.url=jdbc:h2:mem:taskmanager-test;MODE=MySQL;DB_CLOSE_DELAY=-1",
	    "spring.datasource.driver-class-name=org.h2.Driver",
	    "spring.datasource.username=sa",
	    "spring.datasource.password=",
	    "spring.jpa.hibernate.ddl-auto=create-drop",
	    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
	    "jwt.secret=TestSecretKeyWithAtLeastThirtyTwoCharactersForHmac256",
	    "jwt.expiration=3600000"
})
class BackendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private TaskRepository taskRepository;

	@Autowired
	private UserRepository userRepository;

	@BeforeEach
	void clearDatabase() {
	    taskRepository.deleteAll();
	    userRepository.deleteAll();
	}

	@Test
	void registrationAndLoginReturnTokenWithoutExposingPassword() throws Exception {
	    mockMvc.perform(post("/api/auth/register")
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content("{}"))
	            .andExpect(status().isBadRequest());

	    mockMvc.perform(post("/api/auth/register")
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(registerJson("alice", "alice@example.com", "secret"))
	                    .header("Authorization", "Bearer expired-token"))
	            .andExpect(status().isCreated())
	            .andExpect(jsonPath("$.username").value("alice"))
	            .andExpect(content().string(not(containsString("password"))));

	    String loginResponse = mockMvc.perform(post("/api/auth/login")
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(authJson("alice", "secret"))
	                    .header("Authorization", "Bearer expired-token"))
	            .andExpect(status().isOk())
	            .andReturn()
	            .getResponse()
	            .getContentAsString();
	    String token = objectMapper.readTree(loginResponse).get("token").asText();
	    mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + token))
	            .andExpect(status().isOk())
	            .andExpect(content().json("[]"));

	    mockMvc.perform(post("/api/auth/login")
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(authJson("alice", "incorrect")))
	            .andExpect(status().isUnauthorized());

	    mockMvc.perform(get("/api/tasks")
	                    .header("Authorization", "Bearer invalid"))
	            .andExpect(status().isUnauthorized());

	    mockMvc.perform(options("/api/tasks")
	                    .header("Origin", "http://localhost:5173")
	                    .header("Access-Control-Request-Method", "GET"))
	            .andExpect(status().isOk())
	            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
	            .andExpect(header().string("Access-Control-Allow-Methods", containsString("PUT")))
	            .andExpect(header().string("Access-Control-Allow-Methods", containsString("PATCH")))
	            .andExpect(header().string("Access-Control-Allow-Methods", containsString("DELETE")));
	}

	@Test
	void taskCreationPersistsAndRequiresValidAuthentication() throws Exception {
	    String token = registerAndLogin("alice");

	    mockMvc.perform(post("/api/tasks")
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content("{\"title\":\"  Plan semanal  \",\"description\":\"Prioridades\",\"dueDate\":\"2026-12-01\",\"priority\":\"ALTA\"}")
	                    .header("Authorization", "Bearer " + token))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$.title").value("Plan semanal"))
	            .andExpect(jsonPath("$.dueDate").value("2026-12-01"))
	            .andExpect(jsonPath("$.status").value("PENDIENTE"))
	            .andExpect(jsonPath("$.priority").value("ALTA"))
	            .andExpect(jsonPath("$.user").doesNotExist());

	    mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + token))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$[0].title").value("Plan semanal"));

	    mockMvc.perform(post("/api/tasks")
	                    .header("Authorization", "Bearer " + token)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content("{\"title\":\"Prioridad predeterminada\"}"))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$.priority").value("MEDIA"));

	    mockMvc.perform(get("/api/tasks"))
	            .andExpect(status().isUnauthorized());
	}

	@Test
	void usersCanOnlyReadTheirOwnTasks() throws Exception {
	    String aliceToken = registerAndLogin("alice");
	    String bobToken = registerAndLogin("bob");
	    createTask(aliceToken, "Tarea privada");
	    createTask(bobToken, "Otra tarea");

	    mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + aliceToken))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$.length()").value(1))
	            .andExpect(jsonPath("$[0].title").value("Tarea privada"));

	    mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + bobToken))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$.length()").value(1))
	            .andExpect(jsonPath("$[0].title").value("Otra tarea"));
	}

	@Test
	void ownerCanCompleteAndDeleteTaskButOtherUsersCannot() throws Exception {
	    String aliceToken = registerAndLogin("alice");
	    String bobToken = registerAndLogin("bob");
	    Long taskId = createTask(aliceToken, "Entregar informe");

	    mockMvc.perform(patch("/api/tasks/{taskId}/status", taskId)
	                    .header("Authorization", "Bearer " + aliceToken)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content("{\"status\":\"COMPLETADA\"}"))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$.status").value("COMPLETADA"));

	    mockMvc.perform(delete("/api/tasks/{taskId}", taskId)
	                    .header("Authorization", "Bearer " + bobToken))
	            .andExpect(status().isNotFound());

	    mockMvc.perform(patch("/api/tasks/{taskId}/status", taskId)
	                    .header("Authorization", "Bearer " + bobToken)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content("{\"status\":\"PENDIENTE\"}"))
	            .andExpect(status().isNotFound());

	    mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + aliceToken))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$[0].status").value("COMPLETADA"));

	    mockMvc.perform(patch("/api/tasks/{taskId}/status", taskId)
	                    .header("Authorization", "Bearer " + aliceToken)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content("{\"status\":\"PENDIENTE\"}"))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$.status").value("PENDIENTE"));

	    mockMvc.perform(delete("/api/tasks/{taskId}", taskId)
	                    .header("Authorization", "Bearer " + aliceToken))
	            .andExpect(status().isNoContent());

	    mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + aliceToken))
	            .andExpect(status().isOk())
	            .andExpect(content().json("[]"));
	}

	@Test
	void ownerCanEditTaskDetailsWithoutChangingStatus() throws Exception {
	    String aliceToken = registerAndLogin("alice");
	    String bobToken = registerAndLogin("bob");
	    Long taskId = createTask(aliceToken, "Tarea original");

	    mockMvc.perform(patch("/api/tasks/{taskId}/status", taskId)
	                    .header("Authorization", "Bearer " + aliceToken)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content("{\"status\":\"EN_PROGRESO\"}"))
	            .andExpect(status().isOk());

	    String update = objectMapper.writeValueAsString(Map.of(
	            "title", "Tarea actualizada",
	            "description", "Descripción nueva",
	            "dueDate", "2026-12-01",
	            "priority", "ALTA"));

	    mockMvc.perform(put("/api/tasks/{taskId}", taskId)
	                    .header("Authorization", "Bearer " + bobToken)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(update))
	            .andExpect(status().isNotFound());

	    mockMvc.perform(put("/api/tasks/{taskId}", taskId)
	                    .header("Authorization", "Bearer " + aliceToken)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(update))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$.title").value("Tarea actualizada"))
	            .andExpect(jsonPath("$.description").value("Descripción nueva"))
	            .andExpect(jsonPath("$.dueDate").value("2026-12-01"))
	            .andExpect(jsonPath("$.priority").value("ALTA"))
	            .andExpect(jsonPath("$.status").value("EN_PROGRESO"));

	    mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + aliceToken))
	            .andExpect(status().isOk())
	            .andExpect(jsonPath("$[0].title").value("Tarea actualizada"));
	}

	private String registerAndLogin(String username) throws Exception {
	    mockMvc.perform(post("/api/auth/register")
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(registerJson(username, username + "@example.com", "secret")))
	            .andExpect(status().isCreated());
	    return login(username, "secret");
	}

	private String login(String username, String password) throws Exception {
	    String response = mockMvc.perform(post("/api/auth/login")
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(authJson(username, password)))
	            .andExpect(status().isOk())
	            .andReturn()
	            .getResponse()
	            .getContentAsString();
	    JsonNode json = objectMapper.readTree(response);
	    return json.get("token").asText();
	}

	private Long createTask(String token, String title) throws Exception {
	    String response = mockMvc.perform(post("/api/tasks")
	                    .header("Authorization", "Bearer " + token)
	                    .contentType(MediaType.APPLICATION_JSON)
	                    .content(objectMapper.writeValueAsString(Map.of("title", title))))
	            .andExpect(status().isOk())
	            .andReturn()
	            .getResponse()
	            .getContentAsString();
	    return objectMapper.readTree(response).get("id").asLong();
	}

	private String authJson(String username, String password) throws Exception {
	    return objectMapper.writeValueAsString(Map.of("username", username, "password", password));
	}

	private String registerJson(String username, String email, String password) throws Exception {
	    return objectMapper.writeValueAsString(Map.of(
	            "username", username,
	            "email", email,
	            "password", password));
	}
}
