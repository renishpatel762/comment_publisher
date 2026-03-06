package com.example.comment_publisher.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.mapping.Column;
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
    @Column("videoid")
    private String videoId;
    @Column("content")
    private String comment;
    @Column("created_at")
    private Instant createdAt;
}
