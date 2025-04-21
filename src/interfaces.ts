export interface IComment {
  id: string;
  author: string;
  comment: string;
  videoId: string;
  likes: number;
  createdAt: string;
}

export interface IVideo {
  name: string;
  url: string;
}

export interface GetCommentsParams {
  videoId: string;
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}
