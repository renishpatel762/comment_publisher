package com.example.comment_publisher.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table("comments")
public class Comment {
    @PrimaryKey
    private UUID id;
    private String author;
    private String videoId;
    private String comment;
    private int likes;
    private Instant createdAt;
}
