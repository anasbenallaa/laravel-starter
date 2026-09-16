<?php

namespace App\Http\Controllers;

use App\Search\GlobalSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    /**
     * Search users, roles, permissions (and future providers) for the command
     * palette. Only groups the user may view are searched.
     */
    public function __invoke(Request $request, GlobalSearch $search): JsonResponse
    {
        abort_unless($request->user()->canAny($search->permissions()), 403);

        return response()->json([
            'groups' => $search->search($request->user(), (string) $request->query('q', '')),
        ]);
    }
}
