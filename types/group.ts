export interface GroupMember {
  user_id: string;
  is_leader: boolean;
  group_id: string;
  created_at?: string;
}

export interface Group {
  id: string;
  team_name: string;
  current_riddle_id: string | null;
  game_started: boolean;
  finished: boolean;
  active: boolean;
  paid: boolean;
  player_limit: number;
  group_members?: GroupMember[];
  track_id?: string;
}

export interface SessionData {
  groupId: string;
  userId: string;
  teamName: string;
}
