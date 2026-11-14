package com.taskmanager.backend.dto;

import com.taskmanager.backend.model.Task;
import jakarta.validation.constraints.NotNull;

public record TaskStatusRequest(@NotNull Task.Status status) {
}
