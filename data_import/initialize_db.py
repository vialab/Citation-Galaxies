import aiosql
import sqlite3
import asyncpg
import asyncio

dbconfig = {
    'user': 'citationdb',
    'password': 'citationdb',
    'database': 'citationdb'
}


async def execute_query( conn, query, replace, args ):
    sql = query.sql 

    sql = sql.format( *replace )

    results = await conn.execute( sql, *args )

    return results

    
import uuid
import hashlib

async def main():
    conn = await asyncpg.connect(**dbconfig)
    # conn = sqlite3.connect("myapp.db")
    # queries = aiosql.from_path("test.sql", "asyncpg") # Only using this library to load named sql queries from file

    st = '1'

    md5 = hashlib.md5(st.encode('utf-8'))

    uid = uuid.UUID(bytes=md5.digest())
    await conn.set_type_codec( 'uint1',schema='public', encoder=lambda x: str(x), decoder=lambda x: int(x), format='text')
    # v = await queries.varsel(conn,namee=1)
    # v = await queries.varsel(conn, "signal")
    # v = await conn.execute( "insert into test2 values($1,$2::uuid)", uid,uid )
    v = await conn.fetch( "select cite_in_01 from article_search_2003" )

    # aa = queries.create_users(conn)
    # c = queries.test(conn, num="1")

    # users = queries.get_all_users(conn)
    # >>> [(1, "nackjicholson", "William", "Vaughn"), (2, "johndoe", "John", "Doe"), ...]

    # users = await queries.get_user_by_username(conn, username="username")
    # >>> [(1, "nackjicholson", "William", "Vaughn")

    
    print("done!")


if __name__ == "__main__":
    asyncio.run(main())