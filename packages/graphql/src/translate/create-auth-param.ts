import dotProp from "dot-prop";
import { Context } from "../classes";

function createAuthParam({ context }: { context: Context }) {
    const param: { isAuthenticated: boolean; roles?: string[]; jwt: any } = {
        isAuthenticated: false,
        roles: [],
        jwt: {},
    };

    try {
        const jwt = context.getJWT();

        const dotPropKey = process.env.NEO4J_AUTH_ROLES_OBJECT_PATH;

        if (dotPropKey) {
            param.roles = dotProp.get(jwt, dotPropKey);
        } else if (jwt.roles) {
            param.roles = jwt.roles;
        }

        param.jwt = jwt;
    } catch (error) {
        // TODO DEBUG

        return param;
    }

    param.isAuthenticated = true;

    return param;
}

export default createAuthParam;
