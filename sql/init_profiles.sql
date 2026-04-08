create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  store_name text,
  store_slug text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8자리의 영문+숫자 랜덤 문자열 생성 함수
create or replace function public.generate_store_slug()
returns text as $$
declare
  chars text := '0123456789abcdefghijklmnopqrstuvwxyz';
  result text := '';
  i integer := 0;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  
  -- "oc-" 프리픽스와 소문자 난수 반환 (예: oc-a1b2c3d4)
  return 'oc-' || result;
end;
$$ language plpgsql;

-- auth.users 가입 시 profiles에 자동 삽입하는 트리거 함수
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, store_slug)
  values (new.id, new.email, public.generate_store_slug());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 회원가입 완료(insert) 트리거 부착
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 외부 보안(RLS) 정책 설정
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
