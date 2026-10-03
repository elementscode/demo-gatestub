import { test, equal, assert, errorf, sql, session } from "@elements/app";
import { signin } from "#app/shared/services/auth";

test("signin", () => {
  test("door staff land on the door, admins on admin", () => {
    sql(`insert into users (email, name, passwordHash, role) values ('d@test.dev', 'Door', crypt('frontdoor', genSalt('bf', 4)), 'door')`);
    sql(`insert into users (email, name, passwordHash, role) values ('a@test.dev', 'Admin', crypt('backstage', genSalt('bf', 4)), 'admin')`);

    equal(signin(" D@test.dev ", "frontdoor"), "/door");
    equal(session.get("role"), "door");
    equal(signin("a@test.dev", "backstage"), "/admin");
  });

  test("a wrong password says nothing about which part was wrong", () => {
    sql(`insert into users (email, name, passwordHash, role) values ('d@test.dev', 'Door', crypt('frontdoor', genSalt('bf', 4)), 'door')`);

    try {
      signin("d@test.dev", "nope");
      errorf("expected signin to fail");
    } catch (err: any) {
      equal(err.message, "That email and password don't match.");
    }

    assert(!session.isLoggedIn());
  });
});
