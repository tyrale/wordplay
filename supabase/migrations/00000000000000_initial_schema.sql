-- Create users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create games table
create table public.games (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null check (status in ('waiting', 'active', 'completed')) default 'waiting',
  current_player_id uuid references public.users(id),
  initial_word text not null,
  current_word text not null,
  key_letters text[] default '{}',
  locked_letters text[] default '{}'
);

-- Create game_players table (junction table for games and players)
create table public.game_players (
  game_id uuid references public.games(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  score integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (game_id, user_id)
);

-- Create turns table
create table public.turns (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  word text not null,
  score integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies
alter table public.users enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.turns enable row level security;

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Games policies
create policy "Users can view games they're part of"
  on public.games for select
  using (
    exists (
      select 1 from public.game_players
      where game_id = games.id
      and user_id = auth.uid()
    )
  );

create policy "Users can create games"
  on public.games for insert
  with check (true);

create policy "Users can update games they're part of"
  on public.games for update
  using (
    exists (
      select 1 from public.game_players
      where game_id = games.id
      and user_id = auth.uid()
    )
  );

-- Game players policies
create policy "Users can view game players for their games"
  on public.game_players for select
  using (
    exists (
      select 1 from public.game_players gp
      where gp.game_id = game_players.game_id
      and gp.user_id = auth.uid()
    )
  );

create policy "Users can join games"
  on public.game_players for insert
  with check (true);

-- Turns policies
create policy "Users can view turns for their games"
  on public.turns for select
  using (
    exists (
      select 1 from public.game_players
      where game_id = turns.game_id
      and user_id = auth.uid()
    )
  );

create policy "Users can create turns for their games"
  on public.turns for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_id = turns.game_id
      and user_id = auth.uid()
    )
  );

-- Create functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 