import { test, equal, assert, errorf, sql, session } from "@elements/app";
import { signin } from "#app/shared/services/auth";

/** A fresh address per call, so parallel runs never insert the same email. */
function email(name: string): string {
  return `${name}-${crypto.randomUUID().slice(0, 8)}@test.dev`;
}

test("signin", () => {
  test("door staff land on the door, admins on admin", () => {
    let door = email("d");
    let admin = email("a");
    sql(`insert into users (email, name, passwordHash, role) values (${door}, 'Door', crypt('frontdoor', genSalt('bf', 4)), 'door')`);
    sql(`insert into users (email, name, passwordHash, role) values (${admin}, 'Admin', crypt('backstage', genSalt('bf', 4)), 'admin')`);

    equal(signin(` ${door.toUpperCase()} `, "frontdoor"), "/door");
    equal(session.get("role"), "door");
    equal(signin(admin, "backstage"), "/admin");
  });

  test("a wrong password says nothing about which part was wrong", () => {
    let door = email("d");
    sql(`insert into users (email, name, passwordHash, role) values (${door}, 'Door', crypt('frontdoor', genSalt('bf', 4)), 'door')`);

    try {
      signin(door, "nope");
      errorf("expected signin to fail");
    } catch (err: any) {
      equal(err.message, "That email and password don't match.");
    }

    assert(!session.isLoggedIn());
  });
});
