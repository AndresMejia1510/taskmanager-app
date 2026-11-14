package com.taskmanager.backend.dto;

import com.taskmanager.backend.model.Task;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record TaskUpdateRequest(
        @NotBlank String title,
        String description,
        LocalDate dueDate,
        Task.Priority priority) {
}
