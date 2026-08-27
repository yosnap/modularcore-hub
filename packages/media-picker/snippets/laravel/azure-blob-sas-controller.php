<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class AzureBlobUploadTargetController extends Controller
{
    public function __invoke(Request $request, AzureBlobSasIssuer $sas): JsonResponse
    {
        $data = $request->validate([
            'contentType' => ['required', 'string', 'in:image/jpeg,image/png,image/webp'],
            'size' => ['required', 'integer', 'min:1', 'max:10485760'],
        ]);

        // Apply your policy before issuing a credential that grants write access.
        $this->authorize('uploadMedia', $request->user());
        $key = 'uploads/'.$request->user()->getAuthIdentifier().'/'.Str::uuid();

        // AzureBlobSasIssuer is app-owned: generate a User Delegation SAS for exactly $key,
        // permissions create/write and a short TTL. Keep account credentials server-side.
        return response()->json($sas->createWriteTarget($key, $data['contentType']));
    }
}
